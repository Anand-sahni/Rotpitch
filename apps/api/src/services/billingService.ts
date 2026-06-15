import { PLANS, type PaidPlanId, type UserProfile } from '@rotpitch/shared';
import { supabaseAdmin } from '../lib/supabase.js';
import { mapUser } from '../middleware/auth.js';
import { planForProductId, type DodoWebhookEvent, type DodoSubscription } from './dodo.js';

/**
 * Billing lifecycle — applies verified Dodo webhook events to our DB, and a
 * lazy-expiry fallback for the rare case a webhook is missed. Webhooks are the
 * source of truth: credits/plan are only granted here, never trusted from the
 * client or the checkout return URL.
 *
 * Lifecycle (CLAUDE.md §7):
 *   active / renewed / plan_changed → grant the plan's credits (wipe + refill,
 *     no rollover), set the billing window.
 *   on_hold / failed → mark past_due, keep access during Dodo's dunning grace.
 *   cancelled → mark cancelled but KEEP access until the period ends.
 *   expired → drop to Free.
 */

// ---- Webhook idempotency (dedupe by Standard-Webhooks `webhook-id`) ----------

/**
 * A `processing` claim older than this is treated as a crashed prior attempt and
 * may be reclaimed, so an event is never lost when the process dies mid-handle.
 * Dodo spaces its retries out, so this comfortably outlasts a normal handler run
 * without letting concurrent deliveries double-process.
 */
const WEBHOOK_STALE_MS = 5 * 60 * 1000;

/**
 * Claim a webhook id before processing. The row is inserted as `processing` and
 * only flipped to `done` once handling succeeds (markWebhookDone), so a crash
 * between claim and completion leaves a stale `processing` row that a later
 * redelivery can reclaim — the event is never silently lost. Returns false (the
 * caller no-ops) when the event is already `done` or another delivery is in
 * flight; the claim is deleted on a processing failure so Dodo's retry reruns it.
 */
export async function claimWebhook(id: string, type: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('dodo_webhook_events')
    .insert({ id, type, status: 'processing' });
  if (!error) return true;
  if (error.code !== '23505') throw error; // not a unique_violation → real error

  // Row exists. Reclaim ONLY a stale `processing` row (a prior attempt that
  // crashed before finishing). A `done` row or a still-fresh `processing` row
  // (another delivery in flight) fails the predicates → 0 rows → skip. The
  // single conditional UPDATE is the lock: of two racing reclaimers, only the
  // first matches `received_at < cutoff` before it bumps the timestamp.
  const cutoff = new Date(Date.now() - WEBHOOK_STALE_MS).toISOString();
  const { data: reclaimed } = await supabaseAdmin
    .from('dodo_webhook_events')
    .update({ received_at: new Date().toISOString(), type })
    .eq('id', id)
    .eq('status', 'processing')
    .lt('received_at', cutoff)
    .select('id');
  return (reclaimed?.length ?? 0) > 0;
}

/** Mark a claimed webhook as fully processed (the dedupe is now permanent). */
export async function markWebhookDone(id: string): Promise<void> {
  await supabaseAdmin.from('dodo_webhook_events').update({ status: 'done' }).eq('id', id);
}

export async function releaseWebhook(id: string): Promise<void> {
  await supabaseAdmin.from('dodo_webhook_events').delete().eq('id', id);
}

// ---- Event dispatch ---------------------------------------------------------

export async function handleWebhookEvent(event: DodoWebhookEvent): Promise<void> {
  switch (event.type) {
    case 'subscription.active':
    case 'subscription.renewed':
    case 'subscription.plan_changed':
      await grantSubscription(event.data);
      break;
    case 'subscription.on_hold':
    case 'subscription.failed':
      // Payment trouble — Dodo runs dunning during the grace window. Keep the
      // user's access/credits; expiry comes via subscription.expired if it fails.
      await setSubscriptionStatus(event.data, 'past_due');
      break;
    case 'subscription.cancelled':
      // Scheduled cancellation — keep access until the period ends (→ expired).
      await setSubscriptionStatus(event.data, 'cancelled');
      break;
    case 'subscription.expired':
      await expireSubscription(event.data);
      break;
    default:
      // payment.*, dispute.*, refund.*, credit.* — not acted on here.
      break;
  }
}

// ---- Handlers ---------------------------------------------------------------

/** active / renewed / plan_changed: sync the subscription row + grant credits. */
async function grantSubscription(sub: DodoSubscription): Promise<void> {
  const userId = await resolveUserId(sub);
  if (!userId) return; // unknown user — nothing to do (logged in resolveUserId)

  const plan = planForProductId(sub.product_id);
  if (!plan) {
    console.warn(`[billing] subscription ${sub.subscription_id} has unknown product ${sub.product_id}`);
    return;
  }

  await persistDodoCustomerId(userId, sub.customer.customer_id);
  await upsertSubscription(userId, sub, plan, 'active');

  const { error } = await supabaseAdmin.rpc('apply_plan_grant', {
    p_user_id: userId,
    p_plan: plan,
    p_credits: PLANS[plan].monthlyCredits,
    // On a first activation Dodo may not yet carry a previous_billing_date; fall
    // back to the subscription's creation time so the cycle start is never null.
    p_cycle_start: sub.previous_billing_date || sub.created_at,
    p_expires_at: sub.next_billing_date,
    p_payment_id: sub.subscription_id,
  });
  if (error) throw new Error(`apply_plan_grant failed: ${error.message}`);
}

/** on_hold / failed / cancelled: update only the subscription row's status. */
async function setSubscriptionStatus(
  sub: DodoSubscription,
  status: 'past_due' | 'cancelled',
): Promise<void> {
  await supabaseAdmin
    .from('subscriptions')
    .update({ status })
    .eq('payment_gateway', 'dodo')
    .eq('gateway_subscription_id', sub.subscription_id);
}

/** expired: terminal — drop the user to Free unless another sub is still active. */
async function expireSubscription(sub: DodoSubscription): Promise<void> {
  const userId = await resolveUserId(sub);
  if (!userId) return;

  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('payment_gateway', 'dodo')
    .eq('gateway_subscription_id', sub.subscription_id);

  // Guard against downgrading a user who has since started a new active sub
  // (e.g. an old subscription expiring after a fresh purchase).
  const { count } = await supabaseAdmin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');
  if ((count ?? 0) > 0) return;

  const { error } = await supabaseAdmin.rpc('reset_to_free', { p_user_id: userId });
  if (error) throw new Error(`reset_to_free failed: ${error.message}`);
}

// ---- Helpers ----------------------------------------------------------------

async function upsertSubscription(
  userId: string,
  sub: DodoSubscription,
  plan: PaidPlanId,
  status: 'active' | 'past_due' | 'cancelled',
): Promise<void> {
  const { error } = await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      plan,
      payment_gateway: 'dodo',
      gateway_subscription_id: sub.subscription_id,
      status,
      current_period_start: sub.previous_billing_date,
      current_period_end: sub.next_billing_date,
    },
    { onConflict: 'payment_gateway,gateway_subscription_id' },
  );
  if (error) throw new Error(`subscription upsert failed: ${error.message}`);
}

async function persistDodoCustomerId(userId: string, customerId: string): Promise<void> {
  // Only set it if absent, so we never clobber an existing link.
  await supabaseAdmin
    .from('users')
    .update({ dodo_customer_id: customerId })
    .eq('id', userId)
    .is('dodo_customer_id', null);
}

/**
 * Map a Dodo subscription back to our user: trust `metadata.user_id` (set at
 * checkout), else fall back to the stored customer id, else the customer email.
 */
async function resolveUserId(sub: DodoSubscription): Promise<string | null> {
  const fromMeta = sub.metadata?.user_id;
  if (fromMeta) return fromMeta;

  const { data: byCustomer } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('dodo_customer_id', sub.customer.customer_id)
    .maybeSingle();
  if (byCustomer?.id) return byCustomer.id;

  const { data: byEmail } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', sub.customer.email)
    .maybeSingle();
  if (byEmail?.id) return byEmail.id;

  console.warn(`[billing] could not map subscription ${sub.subscription_id} to a user`);
  return null;
}

// ---- Lazy-expiry fallback (webhook is primary; this is the safety net) -------

/**
 * Failed-payment grace window (CLAUDE.md §7: "3-day grace, then suspend"). A
 * past_due subscription keeps access for this long past its period end before we
 * drop the user to Free.
 */
const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Called on credit-consuming requests. If a paid user's credits have expired and
 * no webhook caught up: keep them on their plan if the subscription is still
 * active OR past_due within the grace window, otherwise drop them to Free.
 * Returns the (possibly reloaded) profile. No-op for free users and for paid
 * users whose credits haven't expired yet.
 */
export async function reconcileBilling(profile: UserProfile): Promise<UserProfile> {
  if (profile.plan === 'free' || !profile.creditsExpiresAt) return profile;
  if (new Date(profile.creditsExpiresAt).getTime() > Date.now()) return profile;

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_start, current_period_end, plan')
    .eq('user_id', profile.id)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  const planId = sub?.plan as PaidPlanId | undefined;
  const now = Date.now();
  const periodEnd = sub ? new Date(sub.current_period_end).getTime() : 0;
  const active = sub?.status === 'active' && periodEnd > now;
  // Payment failed but still inside Dodo's dunning grace — keep access; the
  // webhook (subscription.renewed on recovery, .expired on give-up) reconciles.
  const inGrace = sub?.status === 'past_due' && periodEnd + GRACE_PERIOD_MS > now;

  if (planId && (active || inGrace)) {
    // During grace, park expiry at the grace cutoff so we don't re-grant (and
    // wipe usage) on every request until the grace window actually ends.
    const expiresAt = inGrace
      ? new Date(periodEnd + GRACE_PERIOD_MS).toISOString()
      : sub!.current_period_end;
    await supabaseAdmin.rpc('apply_plan_grant', {
      p_user_id: profile.id,
      p_plan: planId,
      p_credits: PLANS[planId].monthlyCredits,
      p_cycle_start: sub!.current_period_start,
      p_expires_at: expiresAt,
      p_payment_id: null,
    });
  } else {
    await supabaseAdmin.rpc('reset_to_free', { p_user_id: profile.id });
  }

  const { data: row } = await supabaseAdmin.from('users').select('*').eq('id', profile.id).single();
  return row ? mapUser(row) : profile;
}

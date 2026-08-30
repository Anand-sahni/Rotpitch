import DodoPayments from 'dodopayments';
import { PAID_PLAN_IDS, type PaidPlanId, type CreditPackId } from '@rotpitch/shared';
import type { UserProfile } from '@rotpitch/shared';
import { env } from '../env.js';
import { AppError } from '../lib/errors.js';

/**
 * Dodo Payments wrapper — our single Merchant of Record (global USD + India INR),
 * replacing the old Stripe + Razorpay split. Hosted Checkout Sessions for
 * purchase, hosted Customer Portal for self-serve manage/cancel, Standard-Webhooks
 * verification on the inbound events. The SDK is initialised lazily so the API
 * still boots without billing configured.
 */

/** A verified, parsed Dodo webhook event (discriminated by `type`). */
export type DodoWebhookEvent = DodoPayments.UnwrapWebhookEvent;
/** The subscription payload carried by subscription.* events. */
export type DodoSubscription = DodoPayments.Subscription;
/** The payment payload carried by payment.* events (one-time top-ups). */
export type DodoPayment = DodoPayments.Payment;

const BILLING_DISABLED = 'Billing is not configured on this server';

let client: DodoPayments | null = null;

/** Lazily build the SDK client. Throws 503 if the API key is missing. */
function getClient(): DodoPayments {
  if (client) return client;
  if (!env.DODO_PAYMENTS_API_KEY) throw new AppError(503, 'billing_unconfigured', BILLING_DISABLED);
  client = new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY ?? null,
    environment: env.DODO_PAYMENTS_ENVIRONMENT,
  });
  return client;
}

/** True when at least the API key + all three product ids are present. */
export function isBillingConfigured(): boolean {
  return Boolean(
    env.DODO_PAYMENTS_API_KEY &&
    env.DODO_PRODUCT_BASIC &&
    env.DODO_PRODUCT_POPULAR &&
    env.DODO_PRODUCT_PRO,
  );
}

const PRODUCT_BY_PLAN: Record<PaidPlanId, string | undefined> = {
  basic: env.DODO_PRODUCT_BASIC,
  popular: env.DODO_PRODUCT_POPULAR,
  pro: env.DODO_PRODUCT_PRO,
};

/** The Dodo product id for a paid plan. Throws 503 if it isn't mapped. */
export function productIdForPlan(plan: PaidPlanId): string {
  const id = PRODUCT_BY_PLAN[plan];
  if (!id)
    throw new AppError(
      503,
      'billing_unconfigured',
      `No Dodo product configured for the ${plan} plan`,
    );
  return id;
}

const PRODUCT_BY_PACK: Record<CreditPackId, string | undefined> = {
  small: env.DODO_CREDIT_PACK_SMALL,
  medium: env.DODO_CREDIT_PACK_MEDIUM,
  large: env.DODO_CREDIT_PACK_LARGE,
};

/**
 * True when the one-time credit-pack products are configured. Independent of
 * `isBillingConfigured` — plan checkout can work while top-ups are still unset.
 */
export function isTopUpConfigured(): boolean {
  return Boolean(
    env.DODO_PAYMENTS_API_KEY &&
    env.DODO_CREDIT_PACK_SMALL &&
    env.DODO_CREDIT_PACK_MEDIUM &&
    env.DODO_CREDIT_PACK_LARGE,
  );
}

/** The Dodo one-time product id for a credit pack. Throws 503 if unmapped. */
export function productIdForPack(pack: CreditPackId): string {
  const id = PRODUCT_BY_PACK[pack];
  if (!id)
    throw new AppError(
      503,
      'billing_unconfigured',
      `No Dodo product configured for the ${pack} credit pack`,
    );
  return id;
}

/** Reverse map: which plan a Dodo product id belongs to (null if unknown). */
export function planForProductId(productId: string): PaidPlanId | null {
  for (const plan of PAID_PLAN_IDS) {
    if (PRODUCT_BY_PLAN[plan] === productId) return plan;
  }
  return null;
}

/**
 * Create a hosted Checkout Session for a paid plan and return its `checkout_url`
 * (the page redirects the browser there). We tag the session with `metadata
 * .user_id` so the webhook can map the resulting subscription back to our user,
 * and reuse the stored Dodo customer id on repeat purchases.
 */
export async function createCheckoutSession(plan: PaidPlanId, user: UserProfile): Promise<string> {
  const dodo = getClient();
  const customer = user.dodoCustomerId
    ? { customer_id: user.dodoCustomerId }
    : { email: user.email };

  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: productIdForPlan(plan), quantity: 1 }],
    customer,
    // Force USD. Dodo geolocates the visitor and defaults Indian traffic to INR,
    // but RECURRING charges in INR are rejected by the processor ("Payment mode
    // not enabled for this merchant") — India's e-mandate rules. Verified
    // empirically: the identical card/product/session fails in INR and succeeds
    // in USD. Our prices and Dodo products are USD anyway, so pin the currency
    // and don't offer a selector that can only lead to a declined subscription.
    billing_currency: 'USD',
    feature_flags: { allow_currency_selection: false },
    return_url: `${env.WEB_ORIGIN}/app/billing?status=success`,
    metadata: { user_id: user.id },
  });

  if (!session.checkout_url) {
    throw new AppError(502, 'billing_error', 'Dodo did not return a checkout URL');
  }
  return session.checkout_url;
}

/**
 * Create a hosted Checkout Session for a ONE-TIME credit pack. Unlike a plan
 * purchase this creates no subscription — the credits are granted when the
 * `payment.succeeded` webhook arrives. We tag the session with the pack id as
 * well as the user id so the webhook knows how many credits to add without
 * having to reverse-map the product; `CREDIT_PACKS` remains the authority on
 * the amount, so a stale or unknown id grants nothing.
 */
export async function createTopUpCheckoutSession(
  pack: CreditPackId,
  user: UserProfile,
): Promise<string> {
  const dodo = getClient();
  const customer = user.dodoCustomerId
    ? { customer_id: user.dodoCustomerId }
    : { email: user.email };

  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: productIdForPack(pack), quantity: 1 }],
    customer,
    // Same USD pinning as plan checkout — see createCheckoutSession. One-time
    // INR does work on this merchant, but there is no reason for the two
    // purchase paths to bill in different currencies.
    billing_currency: 'USD',
    feature_flags: { allow_currency_selection: false },
    return_url: `${env.WEB_ORIGIN}/app/credits?status=topped_up`,
    metadata: { user_id: user.id, credit_pack: pack },
  });

  if (!session.checkout_url) {
    throw new AppError(502, 'billing_error', 'Dodo did not return a checkout URL');
  }
  return session.checkout_url;
}

/**
 * Create a time-bound hosted Customer Portal link (self-serve cancel / change
 * plan / payment method / invoices). Requires the user to already have a Dodo
 * customer id (set on their first checkout).
 */
export async function createPortalLink(customerId: string): Promise<string> {
  const dodo = getClient();
  const session = await dodo.customers.customerPortal.create(customerId, {
    return_url: `${env.WEB_ORIGIN}/app/billing`,
  });
  return session.link;
}

/**
 * Verify a Standard-Webhooks signature and return the parsed event. Throws if the
 * webhook secret is unset (503) or the signature is invalid (the SDK throws).
 */
export function verifyWebhook(rawBody: string, headers: Record<string, string>): DodoWebhookEvent {
  const dodo = getClient();
  if (!env.DODO_PAYMENTS_WEBHOOK_KEY) {
    throw new AppError(503, 'billing_unconfigured', 'Webhook secret is not configured');
  }
  return dodo.webhooks.unwrap(rawBody, { headers, key: env.DODO_PAYMENTS_WEBHOOK_KEY });
}

import DodoPayments from 'dodopayments';
import { PAID_PLAN_IDS, type PaidPlanId } from '@rotpitch/shared';
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
  if (!id) throw new AppError(503, 'billing_unconfigured', `No Dodo product configured for the ${plan} plan`);
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
    return_url: `${env.WEB_ORIGIN}/app/billing?status=success`,
    metadata: { user_id: user.id },
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

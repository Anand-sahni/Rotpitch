import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { checkoutSchema, topUpSchema, planAllowsTopUp } from '@rotpitch/shared';
import { requireAuth } from '../middleware/auth.js';
import { BadRequest } from '../lib/errors.js';
import {
  createCheckoutSession,
  createPortalLink,
  createTopUpCheckoutSession,
} from '../services/dodo.js';

export const billingRouter: RouterType = Router();

/**
 * POST /api/billing/checkout — start a paid-plan purchase. Returns the Dodo
 * hosted Checkout Session URL; the browser redirects there. Credits/plan are
 * granted later by the webhook (the source of truth), never here.
 */
billingRouter.post('/checkout', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const { plan } = checkoutSchema.parse(req.body); // 'basic' | 'popular' | 'pro'
    const url = await createCheckoutSession(plan, user);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/billing/topup — buy a one-time credit pack. Returns the Dodo hosted
 * Checkout Session URL. Credits are granted by the `payment.succeeded` webhook,
 * never here.
 *
 * Paid plans only: a free user's answer to "no credits" is to subscribe, and
 * `apply_plan_grant` replaces the balance on activation, so credits bought on
 * Free would be wiped the moment they subscribed.
 */
billingRouter.post('/topup', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const { pack } = topUpSchema.parse(req.body); // 'small' | 'medium' | 'large'
    if (!planAllowsTopUp(user.plan)) {
      throw BadRequest('Credit top-ups are available on paid plans — upgrade to buy credits');
    }
    const url = await createTopUpCheckoutSession(pack, user);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/billing/portal — open the Dodo hosted Customer Portal (self-serve
 * cancel / change plan / payment method / invoices). Requires an existing Dodo
 * customer, i.e. the user has purchased at least once.
 */
billingRouter.post('/portal', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    if (!user.dodoCustomerId)
      throw BadRequest('No billing account yet — subscribe to a plan first');
    const url = await createPortalLink(user.dodoCustomerId);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

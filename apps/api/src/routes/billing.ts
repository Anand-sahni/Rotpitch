import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { checkoutSchema } from '@rotpitch/shared';
import { requireAuth } from '../middleware/auth.js';
import { BadRequest } from '../lib/errors.js';
import { createCheckoutSession, createPortalLink } from '../services/dodo.js';

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
 * POST /api/billing/portal — open the Dodo hosted Customer Portal (self-serve
 * cancel / change plan / payment method / invoices). Requires an existing Dodo
 * customer, i.e. the user has purchased at least once.
 */
billingRouter.post('/portal', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    if (!user.dodoCustomerId) throw BadRequest('No billing account yet — subscribe to a plan first');
    const url = await createPortalLink(user.dodoCustomerId);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

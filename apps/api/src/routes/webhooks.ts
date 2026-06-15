import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { AppError } from '../lib/errors.js';
import { verifyWebhook, type DodoWebhookEvent } from '../services/dodo.js';
import {
  claimWebhook,
  releaseWebhook,
  markWebhookDone,
  handleWebhookEvent,
} from '../services/billingService.js';

/**
 * Dodo Payments webhooks. Mounted with express.raw (see index.ts) so req.body is
 * the raw Buffer needed for Standard-Webhooks signature verification. We verify,
 * dedupe by `webhook-id`, process, and return 2xx fast. Processing/DB errors
 * return 500 (after releasing the dedupe claim) so Dodo retries.
 */
export const webhooksRouter: RouterType = Router();

webhooksRouter.post('/dodo', async (req, res, next) => {
  const webhookId = req.header('webhook-id') ?? '';

  let event: DodoWebhookEvent;
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body ?? '');
    const headers = {
      'webhook-id': webhookId,
      'webhook-signature': req.header('webhook-signature') ?? '',
      'webhook-timestamp': req.header('webhook-timestamp') ?? '',
    };
    event = verifyWebhook(raw, headers);
  } catch (err) {
    // A real config problem (e.g. missing secret) should surface as such; an
    // invalid signature is a flat 400 (no retry into our handler).
    if (err instanceof AppError) return next(err);
    return res
      .status(400)
      .json({ error: { code: 'invalid_signature', message: 'Invalid webhook signature' } });
  }

  try {
    const claimed = await claimWebhook(webhookId, event.type);
    if (!claimed) return res.json({ received: true, duplicate: true });

    try {
      await handleWebhookEvent(event);
    } catch (err) {
      // Release the claim so Dodo's redelivery can reprocess this event.
      await releaseWebhook(webhookId);
      throw err;
    }

    // Flip the claim to `done` only after the handler succeeds — until now the
    // row is `processing`, so a crash mid-handle leaves it reclaimable.
    await markWebhookDone(webhookId);
    res.json({ received: true });
  } catch (err) {
    next(err); // → 500, Dodo will retry
  }
});

import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { videosRouter } from './routes/videos.js';
import { billingRouter } from './routes/billing.js';
import { webhooksRouter } from './routes/webhooks.js';
import { isBillingConfigured, isTopUpConfigured } from './services/dodo.js';
import { getQueueStats } from './services/queueStats.js';

const app = express();

// CORS locked to the web origin; credentials allowed for the bearer flow.
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));

// Dodo webhooks need the RAW body for signature verification — mount with the
// raw parser BEFORE express.json() so the JSON parser never consumes the body.
app.use('/api/webhooks', express.raw({ type: '*/*' }), webhooksRouter);

app.use(express.json({ limit: '1mb' }));

// Public health check. `billing` reflects whether the Dodo key + all three plan
// product ids are present; `topUp` the same for the one-time credit packs (they
// configure independently) — handy for confirming the live env during setup.
app.get('/health', (_req, res) =>
  res.json({
    ok: true,
    service: 'rotpitch-api',
    billing: isBillingConfigured(),
    topUp: isTopUpConfigured(),
  }),
);

// Render-queue telemetry for the staff admin console. Redis lives on Railway's
// private network, so the manager can't read it directly — the API reports on
// its behalf instead of exposing Redis through a public TCP proxy. Gated by a
// shared secret; without MANAGER_HEALTH_KEY set the route stays disabled.
app.get('/health/queue', async (req, res, next) => {
  const expected = env.MANAGER_HEALTH_KEY;
  if (!expected) {
    res.status(503).json({ error: 'queue telemetry not configured' });
    return;
  }
  const provided = req.get('x-manager-key') ?? '';
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    res.json({ ok: true, ...(await getQueueStats()) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/user/credits', requireAuth, (req, res) => {
  const user = req.user!;
  res.json({
    plan: user.plan,
    creditsBalance: user.creditsBalance,
    creditsExpiresAt: user.creditsExpiresAt,
  });
});

// Video render routes (generate / auto-generate / status).
app.use('/api/videos', videosRouter);

// Billing — Dodo hosted checkout + customer portal.
app.use('/api/billing', billingRouter);

app.use(errorHandler);

// docker-compose (and most PaaS) inject the listen port via $PORT; fall back to API_PORT locally.
const port = Number(process.env.PORT) || env.API_PORT;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${port} (origin ${env.WEB_ORIGIN})`);
});

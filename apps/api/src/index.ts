import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { videosRouter } from './routes/videos.js';
import { billingRouter } from './routes/billing.js';
import { webhooksRouter } from './routes/webhooks.js';
import { isBillingConfigured } from './services/dodo.js';

const app = express();

// CORS locked to the web origin; credentials allowed for the bearer flow.
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));

// Dodo webhooks need the RAW body for signature verification — mount with the
// raw parser BEFORE express.json() so the JSON parser never consumes the body.
app.use('/api/webhooks', express.raw({ type: '*/*' }), webhooksRouter);

app.use(express.json({ limit: '1mb' }));

// Public health check. `billing` reflects whether the Dodo key + all three
// product ids are present — handy for confirming the live env during setup.
app.get('/health', (_req, res) =>
  res.json({ ok: true, service: 'rotpitch-api', billing: isBillingConfigured() }),
);

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

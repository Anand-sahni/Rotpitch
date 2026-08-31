import { env } from './env.js';
import { startRenderWorker } from './workers/renderWorker.js';
import { shutdownAnalytics } from './services/analytics.js';

/** Standalone render-worker process. Run alongside the API (`pnpm dev:worker`). */
const worker = startRenderWorker();
// eslint-disable-next-line no-console
console.log(`[worker] booting (redis ${env.REDIS_URL.replace(/:\/\/[^@]*@/, '://***@')})`);

/**
 * Graceful shutdown. Railway SIGTERMs the container on every redeploy; closing
 * the worker lets an in-flight render finish (or release its lock) instead of
 * stranding the video on "processing", and flushes any queued analytics events.
 */
let closing = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, async () => {
    if (closing) return;
    closing = true;
    // eslint-disable-next-line no-console
    console.log(`[worker] ${signal} — shutting down`);
    await worker.close();
    await shutdownAnalytics();
    process.exit(0);
  });
}

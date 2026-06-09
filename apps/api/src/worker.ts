import { env } from './env.js';
import { startRenderWorker } from './workers/renderWorker.js';

/** Standalone render-worker process. Run alongside the API (`pnpm dev:worker`). */
startRenderWorker();
// eslint-disable-next-line no-console
console.log(`[worker] booting (redis ${env.REDIS_URL.replace(/:\/\/[^@]*@/, '://***@')})`);

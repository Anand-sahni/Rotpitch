import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { env } from '../env.js';

/**
 * BullMQ render queue + Redis connection options. We pass plain options (not an
 * ioredis instance) so BullMQ uses its own bundled ioredis — avoids a dual
 * ioredis-version type clash. `maxRetriesPerRequest: null` is required by
 * BullMQ. The `rediss:` branch keeps TLS support for any managed Redis; the
 * in-box compose Redis uses plain `redis://`. Pro plans enqueue at higher
 * priority (lower number = sooner) so their renders jump the queue.
 */
function parseConnection(url: string): ConnectionOptions {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

export const connection = parseConnection(env.REDIS_URL);

export interface RenderJob {
  videoId: string;
  userId: string;
  inputPath: string; // object path within RAW_BUCKET, e.g. "{uid}/{videoId}.mp4"
  backgroundStyle: string;
  format: 'vertical' | 'horizontal';
  hasWatermark: boolean;
  /** Burn auto-captions (Whisper transcript → libass). Optional for back-compat. */
  hasCaptions?: boolean;
  // Caption placement/style from the editor (see captionOptionsSchema). Optional
  // so older jobs decode; the worker/ASS builder defaults them.
  captionStyle?: string;
  captionX?: number;
  captionY?: number;
  captionScale?: number;
  // Edit-phase adjustments (see editOptionsSchema). Optional so jobs enqueued
  // before this field existed still decode; the worker defaults them.
  productScale?: number;
  backgroundScale?: number;
  splitRatio?: number;
  muted?: boolean;
}

export const RENDER_QUEUE = 'render';
export const renderQueue = new Queue<RenderJob>(RENDER_QUEUE, { connection });

/** Pro renders run ahead of everyone else. */
export const PRIORITY = { high: 1, normal: 10 } as const;

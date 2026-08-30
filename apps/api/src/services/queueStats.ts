import type { Job } from 'bullmq';
import { renderQueue } from '../lib/queue.js';

/**
 * Render-queue telemetry for the staff admin console (RotPitch Manager).
 *
 * The manager runs outside Railway's private network, so it can't reach
 * `redis.railway.internal` directly. Rather than exposing Redis through a public
 * TCP proxy, the API — which is already inside that network and already holds a
 * BullMQ connection — reports the numbers on its behalf.
 *
 * Read-only: counts, Redis INFO fields, and the reasons recent jobs failed.
 */

export interface QueueStats {
  queue: {
    waiting: number;
    active: number;
    prioritized: number;
    delayed: number;
    completed: number;
    failed: number;
    paused: number;
  };
  redis: {
    version?: string;
    uptimeSeconds?: number;
    usedMemoryBytes?: number;
    maxMemoryBytes?: number;
    connectedClients?: number;
    evictedKeys?: number;
    totalKeys?: number;
  };
  recentFailures: Array<{ id: string; reason: string | null; failedAt: string | null }>;
}

/** Parse `INFO` output ("key:value" lines, `# Section` headers) into a map. */
function parseInfo(info: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of info.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    out[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return out;
}

const num = (v: string | undefined): number | undefined => {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export async function getQueueStats(): Promise<QueueStats> {
  const client = await renderQueue.client;

  const [counts, info, dbsize, failedJobs] = await Promise.all([
    renderQueue.getJobCounts(
      'wait',
      'active',
      'delayed',
      'completed',
      'failed',
      'paused',
      'prioritized',
    ),
    client.info(),
    // `client` is typed as BullMQs minimal interface; DBSIZE is a standard
    // Redis command it does not surface.
    (client as unknown as { dbsize(): Promise<number> }).dbsize(),
    renderQueue.getFailed(0, 4),
  ]);

  const i = parseInfo(info);

  return {
    queue: {
      waiting: counts.wait ?? 0,
      active: counts.active ?? 0,
      prioritized: counts.prioritized ?? 0,
      delayed: counts.delayed ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      paused: counts.paused ?? 0,
    },
    redis: {
      version: i.redis_version,
      uptimeSeconds: num(i.uptime_in_seconds),
      usedMemoryBytes: num(i.used_memory),
      maxMemoryBytes: num(i.maxmemory),
      connectedClients: num(i.connected_clients),
      evictedKeys: num(i.evicted_keys),
      totalKeys: dbsize,
    },
    recentFailures: (failedJobs as Job[]).map((j) => ({
      id: String(j.id),
      reason: j.failedReason ?? null,
      failedAt: j.finishedOn ? new Date(j.finishedOn).toISOString() : null,
    })),
  };
}

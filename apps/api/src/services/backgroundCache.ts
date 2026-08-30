import { createHash } from 'node:crypto';
import { mkdir, readdir, rename, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isCustomBackground } from '@rotpitch/shared';
import { supabaseAdmin } from '../lib/supabase.js';
import { env } from '../env.js';
import { downloadTo, resolveBackgroundSource } from './storage.js';

/**
 * On-disk cache for catalog background loops.
 *
 * Backgrounds are the same handful of files re-used by every render, but the
 * worker was re-downloading one on EVERY job. Measured on the live catalog they
 * average ~14.7 MB (largest 41 MB), which made the background ~65% of all
 * Supabase egress per render — ~22.8 MB, of which only ~8 MB is genuinely
 * per-job (the user's upload + their finished download). Caching them locally
 * cuts per-render egress to ~8 MB and roughly triples how many renders fit in a
 * given egress budget.
 *
 * Design notes:
 * - Only CATALOG backgrounds are cached. A `custom:<path>` background is one
 *   user's own upload, used once, so caching it would only burn disk.
 * - Freshness is checked with a metadata lookup (bytes, not megabytes) and the
 *   cache key embeds size + last-modified, so replacing a loop under the same
 *   filename invalidates the entry instead of serving a stale file.
 * - Entries are evicted least-recently-used once the directory exceeds the cap.
 * - The cache lives OUTSIDE the per-job temp dir, which the worker deletes in
 *   its `finally`. On a container without a mounted volume it is simply cold
 *   after each deploy and re-warms on first use — still a large net win.
 */

const CACHE_SUFFIX = '.bin';

function cacheDir(): string {
  return env.BACKGROUND_CACHE_DIR || join(tmpdir(), 'rotpitch-bg-cache');
}

function cacheEnabled(): boolean {
  return env.BACKGROUND_CACHE_MAX_MB > 0;
}

function keyFor(objectPath: string, size: number, updatedAt: string): string {
  const h = createHash('sha1').update(objectPath).digest('hex').slice(0, 16);
  return `${h}-${size}-${Date.parse(updatedAt) || 0}${CACHE_SUFFIX}`;
}

/**
 * Fetch an object's size + last-modified without transferring the object. Used
 * to decide whether a cached copy is still current. Returns null if the lookup
 * fails, in which case the caller falls back to an uncached download rather
 * than risk serving something stale.
 */
async function catalogObjectMeta(
  objectPath: string,
): Promise<{ size: number; updatedAt: string } | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(env.BACKGROUND_BUCKET)
    .list('', { limit: 1000, search: objectPath });
  if (error || !data) return null;
  const hit = data.find((o) => o.name === objectPath);
  const size = (hit?.metadata as { size?: number } | undefined)?.size;
  if (!hit || typeof size !== 'number') return null;
  return { size, updatedAt: hit.updated_at ?? hit.created_at ?? '' };
}

/** Drop the oldest entries until the cache fits inside its size budget. */
async function evictToCap(dir: string): Promise<void> {
  const capBytes = env.BACKGROUND_CACHE_MAX_MB * 1024 * 1024;
  let entries: { path: string; size: number; atimeMs: number }[];
  try {
    const names = await readdir(dir);
    entries = await Promise.all(
      names
        .filter((n) => n.endsWith(CACHE_SUFFIX))
        .map(async (n) => {
          const p = join(dir, n);
          const s = await stat(p);
          return { path: p, size: s.size, atimeMs: s.atimeMs };
        }),
    );
  } catch {
    return;
  }
  let total = entries.reduce((a, e) => a + e.size, 0);
  if (total <= capBytes) return;
  entries.sort((a, b) => a.atimeMs - b.atimeMs); // least recently used first
  for (const e of entries) {
    if (total <= capBytes) break;
    await rm(e.path, { force: true });
    total -= e.size;
    // eslint-disable-next-line no-console
    console.log(`[bg-cache] evicted ${e.path} (${(e.size / 1048576).toFixed(1)} MB)`);
  }
}

/**
 * Return a local path holding the requested background, downloading only when
 * necessary. `fallbackPath` is used for anything not cacheable (custom
 * backgrounds, or when caching is disabled/unavailable) and must live inside
 * the caller's temp dir.
 */
export async function materializeBackground(style: string, fallbackPath: string): Promise<string> {
  const src = resolveBackgroundSource(style);

  if (!cacheEnabled() || isCustomBackground(style) || src.bucket !== env.BACKGROUND_BUCKET) {
    await downloadTo(src.bucket, src.objectPath, fallbackPath);
    return fallbackPath;
  }

  const meta = await catalogObjectMeta(src.objectPath);
  if (!meta) {
    // Couldn't confirm freshness — download rather than trust a stale entry.
    await downloadTo(src.bucket, src.objectPath, fallbackPath);
    return fallbackPath;
  }

  const dir = cacheDir();
  const target = join(dir, keyFor(src.objectPath, meta.size, meta.updatedAt));

  try {
    const s = await stat(target);
    if (s.size === meta.size) {
      const now = new Date();
      await utimes(target, now, s.mtime).catch(() => undefined); // refresh LRU
      // eslint-disable-next-line no-console
      console.log(`[bg-cache] hit  ${src.objectPath} (${(meta.size / 1048576).toFixed(1)} MB saved)`);
      return target;
    }
    await rm(target, { force: true }); // truncated/partial entry
  } catch {
    // miss — fall through and populate
  }

  await mkdir(dir, { recursive: true });
  const staging = `${target}.${process.pid}.partial`;
  await downloadTo(src.bucket, src.objectPath, staging);
  await rename(staging, target); // atomic publish
  // eslint-disable-next-line no-console
  console.log(`[bg-cache] miss ${src.objectPath} (${(meta.size / 1048576).toFixed(1)} MB downloaded)`);

  await evictToCap(dir);
  return target;
}

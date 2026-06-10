import { writeFile } from 'node:fs/promises';
import { isCustomBackground, customBackgroundPath } from '@rotpitch/shared';
import { supabaseAdmin } from '../lib/supabase.js';
import { env } from '../env.js';
import { AppError } from '../lib/errors.js';

/**
 * Supabase Storage helpers for the render worker. The service-role client
 * bypasses RLS, so it can read any user's raw upload and list the background
 * catalog. Finished render OUTPUT no longer lives here — it goes to AWS S3
 * (see services/s3.ts).
 */

/** Download an object from a bucket to a local file path. */
export async function downloadTo(bucket: string, objectPath: string, localPath: string): Promise<void> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(objectPath);
  if (error || !data) {
    throw new AppError(502, 'storage_download_failed', `Could not download ${bucket}/${objectPath}: ${error?.message ?? 'no data'}`);
  }
  const buf = Buffer.from(await data.arrayBuffer());
  await writeFile(localPath, buf);
}

/** Object path of a background loop within the backgrounds bucket. The style
 * id IS the full object name (e.g. "Temple Run.mp4"), so this is a pass-through. */
export function backgroundObjectPath(style: string): string {
  return style;
}

/**
 * Resolve where the worker downloads a background from. Catalog styles live in
 * the backgrounds bucket (object name = style id); custom uploads (`custom:<path>`)
 * are the user's own file in the raw-uploads bucket.
 */
export function resolveBackgroundSource(style: string): { bucket: string; objectPath: string } {
  if (isCustomBackground(style)) {
    return { bucket: env.RAW_BUCKET, objectPath: customBackgroundPath(style)! };
  }
  return { bucket: env.BACKGROUND_BUCKET, objectPath: backgroundObjectPath(style) };
}

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i;

/**
 * List every background loop in the `backgrounds` bucket, sorted by name. The
 * full object name is the style id (worker downloads it verbatim). Sorting must
 * match the web picker so positional plan-gating (free = first N) agrees.
 */
export async function listBackgrounds(): Promise<string[]> {
  const { data, error } = await supabaseAdmin.storage
    .from(env.BACKGROUND_BUCKET)
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error) {
    throw new AppError(502, 'storage_list_failed', `Could not list backgrounds: ${error.message}`);
  }
  return (data ?? [])
    .filter((o) => o.id !== null && VIDEO_EXT.test(o.name))
    .map((o) => o.name)
    .sort((a, b) => a.localeCompare(b));
}

/** Best-effort delete of an object; logs but never throws (delete is idempotent). */
export async function removeObject(bucket: string, objectPath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([objectPath]);
  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[storage] remove failed for ${bucket}/${objectPath}:`, error.message);
  }
}

export { env as storageEnv };

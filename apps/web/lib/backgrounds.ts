/**
 * Background style helpers. The catalog is no longer hardcoded — it's whatever
 * lives in the Supabase `backgrounds` bucket. The server lists it (see
 * lib/data.ts `getBackgrounds`) and passes the result to the Create screen; the
 * render worker downloads the same object by name. Plan-gating is positional
 * (free = first FREE_STYLE_COUNT in name order), so web + API must sort alike.
 */

/** One selectable background loop, derived from a bucket object. */
export interface BackgroundStyle {
  /** Full object name in the bucket — the style id (e.g. "Temple Run.mp4"). */
  name: string;
  /** Display label: the file name without its extension (e.g. "Temple Run"). */
  label: string;
  /** Public URL of the loop for the picker preview. */
  previewUrl: string;
}

/** Free tier may use only the first N styles (PLANS.free.backgroundStyles). */
export const FREE_STYLE_COUNT = 5;

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i;

/** "GTA V driving in Los Santos.mp4" → "GTA V driving in Los Santos". */
export function backgroundLabel(objectName: string): string {
  const stem = objectName.replace(VIDEO_EXT, '').trim();
  return stem || objectName;
}

/**
 * Public URL of a background loop in the Supabase `backgrounds` bucket. Takes
 * the full object name (with extension); the worker reads the same object, so
 * picker preview and render source stay in lockstep. The bucket is public.
 */
export function backgroundPreviewUrl(objectName: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/backgrounds/${encodeURIComponent(objectName)}`;
}

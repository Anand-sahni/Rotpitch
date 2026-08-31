/**
 * Marketing-only media lives in its own public Supabase bucket, deliberately
 * NOT in `backgrounds`. `getBackgrounds` lists that bucket and the free tier is
 * gated *positionally* (first FREE_STYLE_COUNT in name order — see
 * lib/backgrounds.ts), so any extra object dropped there silently reshuffles
 * which styles are free. Keep landing-page cuts out of it.
 *
 * Objects are uploaded immutable (`public, max-age=31536000, immutable`), so
 * names carry a version suffix: never overwrite `-v1`, publish `-v2`.
 */
export function marketingAssetUrl(objectName: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/marketing/${encodeURIComponent(objectName)}`;
}

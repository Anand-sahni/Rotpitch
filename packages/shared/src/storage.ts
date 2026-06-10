/**
 * Storage helpers shared between the API/worker and the web data layer.
 *
 * Finished renders now live in AWS S3 in a PRIVATE bucket; `videos.output_url`
 * stores the S3 object KEY (e.g. `{userId}/{videoId}.mp4`), and each side mints
 * a short-lived presigned GET URL on read. Rows written before the S3 cutover
 * still hold a full Supabase public URL — `isAbsoluteUrl` lets readers pass
 * those through unchanged instead of trying to presign them as a key.
 */

/** True if a stored output value is already a usable absolute URL (legacy rows). */
export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** S3 object key for a finished render output. */
export function outputObjectKey(userId: string, videoId: string): string {
  return `${userId}/${videoId}.mp4`;
}

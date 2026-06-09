/**
 * Guard against open redirects: only allow same-origin internal paths.
 * Rejects absolute URLs and protocol-relative (`//evil.com`) targets.
 */
export function safeInternalPath(path: string | null | undefined, fallback = '/app'): string {
  if (!path) return fallback;
  if (!path.startsWith('/') || path.startsWith('//')) return fallback;
  return path;
}

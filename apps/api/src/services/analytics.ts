import { PostHog } from 'posthog-node';
import { env } from '../env.js';

/**
 * Server-side product analytics (PostHog).
 *
 * The render pipeline is asynchronous and runs in a separate process, so the
 * browser has no idea whether a queued render actually succeeded — these events
 * are the only source of truth for the back half of the funnel
 * (`render_requested` in the web app → `render_succeeded` here).
 *
 * Events are attributed to the Supabase `users.id` UUID, which is exactly what
 * the browser passes to `posthog.identify()`. Same distinct id on both sides =
 * one person, one funnel.
 *
 * Inert without `POSTHOG_API_KEY`: no client is created and every capture is a
 * no-op, so the API and worker boot and run unchanged without it.
 */

/** Events emitted by the API/worker. Client-side events live in apps/web/lib/analytics.ts. */
export type ServerAnalyticsEvent = 'render_started' | 'render_succeeded' | 'render_failed';

const client = env.POSTHOG_API_KEY
  ? new PostHog(env.POSTHOG_API_KEY, {
      host: env.POSTHOG_HOST,
      // Renders are low-volume (seconds apart at most) and the worker is
      // SIGTERMed on every Railway redeploy — batching would just lose events.
      flushAt: 1,
      flushInterval: 0,
    })
  : null;

export const analyticsEnabled = client !== null;

/**
 * Record an event against a user. Fire-and-forget: analytics must never fail a
 * render, so nothing here throws and nothing is awaited by the caller.
 */
export function captureServerEvent(
  userId: string,
  event: ServerAnalyticsEvent,
  properties?: Record<string, unknown>,
): void {
  if (!client) return;
  try {
    client.capture({ distinctId: userId, event, properties });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[analytics] capture failed:', err instanceof Error ? err.message : err);
  }
}

/** Flush and close on shutdown so in-flight events survive a redeploy. */
export async function shutdownAnalytics(): Promise<void> {
  if (!client) return;
  try {
    await client.shutdown();
  } catch {
    // Losing analytics on the way out is never worth blocking shutdown.
  }
}

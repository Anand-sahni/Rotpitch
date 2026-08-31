import type { PostHog } from 'posthog-js';

/**
 * Client-side product analytics (PostHog).
 *
 * Two analytics tools run side by side and answer different questions:
 *   - **Vercel Web Analytics** — top-of-funnel traffic on the marketing pages
 *     (see `components/analytics/VercelAnalytics.tsx`). Pageviews only.
 *   - **PostHog** (this module) — the product funnel *behind* signup, plus the
 *     server-side render events the browser can never see (apps/api).
 *
 * Everything here is INERT until `NEXT_PUBLIC_POSTHOG_KEY` is set: nothing is
 * downloaded, no network call is made, and every capture is a no-op. That way
 * the instrumentation can ship before the PostHog account exists.
 *
 * `posthog-js` is ~267 kB and is loaded through a DYNAMIC import on purpose —
 * a static one puts it in the root layout's chunk, which every marketing
 * visitor then downloads on first load. Keep it dynamic.
 *
 * IMPORTANT: browser-only — import this from `'use client'` components only.
 */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
/** PostHog Cloud US by default. `||` not `??`: a blank line in .env yields '',
 *  which is not nullish and would otherwise be used verbatim as the host. */
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

/** True when a key is configured. False = every export here is a no-op. */
export const analyticsEnabled = Boolean(KEY);

let ph: PostHog | null = null;
let loadStarted = false;
/**
 * Calls made in the window between first paint and the async chunk landing
 * (~one round trip). Drained in order once PostHog is live, so an event fired
 * by a fast click isn't silently lost. Capped so a failed load can't grow it
 * without bound.
 */
const pending: Array<(client: PostHog) => void> = [];
const PENDING_MAX = 25;

function withPostHog(fn: (client: PostHog) => void): void {
  if (!KEY) return;
  if (ph) {
    fn(ph);
  } else if (pending.length < PENDING_MAX) {
    pending.push(fn);
  }
}

/**
 * The full client-side event vocabulary. A closed union rather than free-form
 * strings so a typo can't silently create a second, near-identical event that
 * quietly breaks a funnel. The render lifecycle (`render_started`,
 * `render_succeeded`, `render_failed`) is emitted by the WORKER, not here —
 * see `apps/api/src/services/analytics.ts`.
 */
export type AnalyticsEvent =
  | 'signed_up'
  | 'logged_in'
  | 'oauth_started'
  | 'demo_selected'
  | 'demo_rejected'
  | 'demo_uploaded'
  | 'render_requested'
  | 'render_request_failed'
  | 'video_downloaded'
  | 'checkout_started';

/** Load + initialise once per page load. Safe to call repeatedly. */
export function initAnalytics(): void {
  if (!KEY || loadStarted || typeof window === 'undefined') return;
  loadStarted = true;
  import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        // The App Router changes routes without a page load, so posthog's own
        // history hooks would miss them — PostHogProvider captures $pageview on
        // every pathname/search change instead.
        capture_pageview: false,
        // Only build person profiles for users we've identified. Anonymous
        // marketing traffic still sends events but costs no monthly profile —
        // Vercel Web Analytics is what actually watches that traffic.
        person_profiles: 'identified_only',
      });
      ph = posthog;
      for (const fn of pending.splice(0)) fn(posthog);
    })
    .catch(() => {
      // Blocked by an ad blocker, offline, or a bad key. Analytics is never
      // worth a console error in a user's browser — drop it and move on.
      pending.length = 0;
    });
}

/** Fire a product event. No-op until PostHog is configured. */
export function capture(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  withPostHog((client) => client.capture(event, properties));
}

/**
 * Bind the current person to their Supabase user id. The id MUST be the
 * Supabase `users.id` UUID — the worker sends its render events under the same
 * id, and that is the only thing stitching the two halves of the funnel into
 * one person.
 */
export function identifyUser(
  userId: string,
  traits?: { email?: string; plan?: string; createdAt?: string | null },
): void {
  withPostHog((client) =>
    client.identify(userId, {
      ...(traits?.email ? { email: traits.email } : {}),
      ...(traits?.plan ? { plan: traits.plan } : {}),
      ...(traits?.createdAt ? { signed_up_at: traits.createdAt } : {}),
    }),
  );
}

/** Drop the identity on sign-out so the next user on this browser is separate. */
export function resetAnalytics(): void {
  withPostHog((client) => client.reset());
}

/** Manual pageview, used by PostHogProvider on App Router navigations. */
export function capturePageview(url: string): void {
  withPostHog((client) => client.capture('$pageview', { $current_url: url }));
}

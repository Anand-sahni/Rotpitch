'use client';

import { Analytics } from '@vercel/analytics/next';

/**
 * Vercel Web Analytics — top-of-funnel traffic only.
 *
 * Deliberately scoped to the marketing + auth surface: `/app/*` pageviews are
 * dropped before they're sent. Vercel Web Analytics bills per event and isn't
 * built for funnels, so in-app behaviour belongs to PostHog and this stays a
 * clean "who is arriving at rotpitch.com, from where" view.
 *
 * Needs to be a client component because `beforeSend` is a function prop, and
 * a Server Component can't pass one across the boundary.
 */
export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const path = new URL(event.url).pathname;
        return path === '/app' || path.startsWith('/app/') ? null : event;
      }}
    />
  );
}

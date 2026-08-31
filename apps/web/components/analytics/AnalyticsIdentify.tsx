'use client';

import { useEffect } from 'react';
import { identifyUser } from '@/lib/analytics';

/**
 * Ties the browser's PostHog person to the signed-in Supabase user. Rendered by
 * the protected layout, so it re-asserts the identity on every authenticated
 * page load (cheap, and survives a cleared posthog cookie).
 *
 * Props are plain strings so a Server Component can render this directly.
 */
export function AnalyticsIdentify({
  userId,
  email,
  plan,
  createdAt,
}: {
  userId: string;
  email?: string;
  plan?: string;
  createdAt?: string | null;
}) {
  useEffect(() => {
    identifyUser(userId, { email, plan, createdAt });
  }, [userId, email, plan, createdAt]);

  return null;
}

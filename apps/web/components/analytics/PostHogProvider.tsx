'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initAnalytics, capturePageview } from '@/lib/analytics';

/**
 * Boots PostHog and reports App Router navigations as $pageview.
 *
 * Mounted once in the root layout. With `NEXT_PUBLIC_POSTHOG_KEY` unset this
 * renders nothing and loads no script, so the default build is unchanged.
 */
function PostHogPageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    capturePageview(`${window.location.origin}${pathname}${qs ? `?${qs}` : ''}`);
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider() {
  // useSearchParams() suspends during prerender; without this boundary every
  // static marketing page in the tree would be forced into client rendering.
  return (
    <Suspense fallback={null}>
      <PostHogPageviews />
    </Suspense>
  );
}

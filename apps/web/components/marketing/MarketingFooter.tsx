import Link from 'next/link';
import { Brand } from '@/components/Brand';
import { SUPPORT_EMAIL } from '@/lib/site';

/**
 * Shared marketing footer — the colophon. Product/account/legal columns plus
 * the brand blurb and support email. Used by the landing page and the
 * standalone marketing pages so the footer stays identical site-wide.
 */

type Col = { title: string; links: readonly (readonly [string, string])[] };

const COLUMNS: readonly Col[] = [
  {
    title: 'product',
    links: [
      ['How it works', '/#pipeline'],
      ['The rot library', '/#library'],
      ['Pricing', '/#pricing'],
    ],
  },
  {
    title: 'account',
    links: [
      ['Log in', '/login'],
      ['Sign up free', '/signup'],
      ['Dashboard', '/app'],
    ],
  },
  {
    title: 'legal',
    links: [
      ['Privacy policy', '/privacy'],
      ['Terms of service', '/terms'],
      ['Contact', '/contact'],
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface px-6 py-16">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="mt-4 max-w-[34ch] text-sm text-t2">
              RotPitch is not a video editor. It&apos;s a growth tool that happens to output video.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 inline-block font-mono text-[12px] text-t3 transition-colors hover:text-volt"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-t4">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith('/') && !href.includes('#') ? (
                      <Link href={href} className="text-sm text-t2 transition-colors hover:text-t1">
                        {label}
                      </Link>
                    ) : (
                      <a href={href} className="text-sm text-t2 transition-colors hover:text-t1">
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="font-mono text-[11px] text-t3">© 2026 RotPitch. All rights reserved.</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-t4">
            session_retention: 100% — told you it works.
          </p>
        </div>
      </div>
    </footer>
  );
}

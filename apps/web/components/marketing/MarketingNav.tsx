import Link from 'next/link';
import { Brand } from '@/components/Brand';

/**
 * Shared marketing chrome — the fixed "session HUD": a scrolling ticker over a
 * frosted-glass nav. Used by the landing page and every standalone marketing
 * page (legal, contact) so the header stays identical site-wide. Section links
 * are absolute (`/#…`) so they scroll to the landing anchors from any route.
 *
 * Pairs with `pt-[92px]` on the page's <main> (ticker h-7 + nav h-16 = 92px).
 */

const TICKER_ITEMS = [
  'TYPICAL RENDER: 8s',
  '1 CREDIT = 1 VIDEO',
  'FAILED RENDER → AUTO-REFUND',
  'CAPTIONS: BURNED IN',
  'NO TIMELINE. EVER.',
  'ZERO EDITING DETECTED',
  'DOPAMINE LEVELS: NOMINAL',
  'YOUR COMPETITORS ARE ALREADY POSTING',
];

const NAV_LINKS = [
  { href: '/#pipeline', label: 'How' },
  { href: '/#library', label: 'Backgrounds' },
  { href: '/#pricing', label: 'Pricing' },
];

export function MarketingNav() {
  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div className="rp-marquee h-7 border-b border-border bg-surface">
        <div className="rp-marquee-track items-center" style={{ ['--speed' as string]: '40s' }}>
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1}
              className="flex h-7 items-center whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-t3"
            >
              {TICKER_ITEMS.map((item) => (
                <span key={item} className="flex items-center">
                  <span className="px-4">{item}</span>
                  <span className="text-volt">·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <nav className="h-16 border-b border-border bg-[var(--glass)] shadow-md backdrop-blur-glass">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
          <Link href="/" aria-label="RotPitch home">
            <Brand />
          </Link>
          <div className="hidden items-center gap-7 font-mono text-[12px] uppercase tracking-[0.14em] md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-t2 transition-colors hover:text-t1">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="hidden font-medium text-t2 transition-colors hover:text-t1 sm:block"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="signal-gradient rounded-sm px-4 py-2 font-syne font-bold tracking-tight text-black transition-transform hover:scale-105 active:scale-95"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}

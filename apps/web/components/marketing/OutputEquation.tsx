'use client';

import { useEffect, useRef } from 'react';
import { marketingAssetUrl } from '@/lib/marketing';

/**
 * SEC.04 — the render stated as an equation: your footage + a loop = the post.
 *
 * Replaces the old before/after wipe. The wipe framed one 9:16 clip inside a
 * wide section, which left most of the row empty; three portrait panels use
 * the same width and say more — the recipe is legible at a glance instead of
 * needing a drag to discover.
 *
 * All three cuts are exactly 312 frames @30fps, so once started together they
 * loop in lockstep. `input` and `output` are the same recording, so they are
 * additionally held in sync — a visible mismatch between them would read as a
 * different clip rather than the same one treated differently. The background
 * panel free-runs; it illustrates the loop, it isn't claiming to be the frame
 * composited underneath.
 */

interface Panel {
  slug: string;
  /** Mono caption under the panel. */
  label: string;
  /** The result gets the volt treatment; the inputs stay quiet. */
  emphasis?: boolean;
}

const PANELS: Panel[] = [
  { slug: 'demo-before-v2', label: 'input.mp4' },
  { slug: 'demo-bg-v1', label: 'background.mp4' },
  { slug: 'demo-after-v2', label: 'output.mp4', emphasis: true },
];

/** Sides further apart than this are showing different moments — resync. */
const MAX_DRIFT_S = 0.25;

function Glyph({ children }: { children: string }) {
  return (
    <span aria-hidden className="shrink-0 font-syne text-2xl font-bold text-t3 sm:text-3xl">
      {children}
    </span>
  );
}

export function OutputEquation() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Reduced motion: all three rest on their posters, never fetch an mp4.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const videos = Array.from(root.querySelectorAll<HTMLVideoElement>('video[data-rp-panel]'));
    const input = root.querySelector<HTMLVideoElement>('video[data-rp-panel="demo-before-v2"]');
    const output = root.querySelector<HTMLVideoElement>('video[data-rp-panel="demo-after-v2"]');

    const resync = () => {
      if (!input || !output) return;
      if (Math.abs(input.currentTime - output.currentTime) > MAX_DRIFT_S) {
        input.currentTime = output.currentTime;
      }
    };
    output?.addEventListener('timeupdate', resync);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) {
          // Start from a common zero so the lockstep actually holds.
          videos.forEach((v) => {
            v.currentTime = 0;
            void v.play().catch(() => {});
          });
        } else {
          videos.forEach((v) => v.pause());
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(root);

    return () => {
      output?.removeEventListener('timeupdate', resync);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-3 md:gap-5"
    >
      {PANELS.map((panel, i) => (
        <div key={panel.slug} className="contents">
          {i > 0 && <Glyph>{i === 1 ? '+' : '='}</Glyph>}
          <figure className="w-[min(70vw,260px)] shrink-0">
            <div
              className={
                'relative aspect-[9/16] overflow-hidden rounded-md bg-base ' +
                (panel.emphasis
                  ? 'border-2 border-volt shadow-[0_0_28px_-6px_rgba(203,255,61,0.45)]'
                  : 'border border-border')
              }
            >
              <video
                data-rp-panel={panel.slug}
                className="absolute inset-0 h-full w-full object-cover"
                src={marketingAssetUrl(`${panel.slug}.mp4`)}
                poster={marketingAssetUrl(`${panel.slug}.jpg`)}
                preload="none"
                muted
                loop
                playsInline
                aria-hidden
                tabIndex={-1}
              />
            </div>
            <figcaption
              className={
                'mt-2.5 text-center font-mono text-[11px] lowercase tracking-wide ' +
                (panel.emphasis ? 'text-volt' : 'text-t3')
              }
            >
              {panel.label}
            </figcaption>
          </figure>
        </div>
      ))}
    </div>
  );
}

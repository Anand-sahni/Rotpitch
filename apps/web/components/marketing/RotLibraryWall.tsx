'use client';

import { useEffect, useRef } from 'react';
import { marketingAssetUrl } from '@/lib/marketing';

/**
 * "Pick your poison" — a full-bleed double marquee of the real background
 * catalog. Every tile is a 480×270 web cut of the actual object in the
 * Supabase `backgrounds` bucket (see lib/marketing.ts for why the cuts live in
 * a separate bucket), so the wall can't drift from what the picker offers.
 *
 * Cost control: the marquee renders each row twice, so 10 tiles = 20 <video>
 * elements. Each ships `preload="none"` + a poster, and only tiles actually
 * intersecting the viewport get `.play()` — off-screen ones are paused and
 * never fetch their mp4. Under reduced-motion nothing plays at all and the
 * posters stand as finished stills.
 *
 * `free` mirrors lib/backgrounds.ts FREE_STYLE_COUNT = 5 applied to the bucket
 * in localeCompare name order; keep the two in step if the catalog changes.
 */

interface Tile {
  /** Slug of the marketing cut: bg-<slug>-v1.mp4 / .jpg in the bucket. */
  slug: string;
  /** Object name in the `backgrounds` bucket — the real style id. */
  name: string;
  styleTag: string;
  free?: boolean;
}

const ROW_ONE: Tile[] = [
  { slug: 'temple-run', name: 'Temple Run.mp4', styleTag: 'gameplay' },
  { slug: 'cutting-soap', name: 'cutting soap.mp4', styleTag: 'asmr', free: true },
  { slug: 'hydraulic-press', name: 'hydraulic press.mp4', styleTag: 'asmr', free: true },
  { slug: 'kinetic-sand', name: 'Kinetic Sand ASMR.mp4', styleTag: 'asmr' },
  { slug: 'minecraft-parkour', name: 'Minecraft Parkour.mp4', styleTag: 'gameplay', free: true },
];

const ROW_TWO: Tile[] = [
  { slug: 'subway-surfers', name: 'subway_surfers.mp4', styleTag: 'gameplay' },
  { slug: 'waterfalls', name: 'Slow Motion Water Falls.mp4', styleTag: 'abstract' },
  { slug: 'dice-roll', name: 'Satisfying Dice Roll and Drop.mp4', styleTag: 'asmr' },
  { slug: 'lava-lamp', name: 'Relaxing lava lamp.mp4', styleTag: 'abstract', free: true },
  { slug: 'gta-v', name: 'GTA V driving in Los Santos.mp4', styleTag: 'gameplay', free: true },
];

function TileCard({ tile }: { tile: Tile }) {
  return (
    <div className="relative aspect-video w-[240px] shrink-0 overflow-hidden rounded-md border border-border bg-card transition-transform duration-200 hover:scale-[1.04] hover:border-volt/50 sm:w-[280px]">
      <video
        // data-rp-tile: the observer below claims these; see RotLibraryWall.
        data-rp-tile
        className="absolute inset-0 h-full w-full object-cover"
        src={marketingAssetUrl(`bg-${tile.slug}-v1.mp4`)}
        poster={marketingAssetUrl(`bg-${tile.slug}-v1.jpg`)}
        preload="none"
        muted
        loop
        playsInline
        // Decorative: the tile's meaning is carried by the caption below it.
        aria-hidden
        tabIndex={-1}
      />
      {/* Real catalog names run long — clamp so they never reach the style tag. */}
      <span
        title={tile.name}
        className="absolute bottom-2 left-2 max-w-[62%] truncate rounded-xs bg-black/55 px-1.5 py-0.5 font-mono text-[10px] lowercase tracking-wide text-t1"
      >
        {tile.name}
      </span>
      <span className="absolute bottom-2 right-2 font-mono text-[9px] uppercase tracking-[0.18em] text-t3">
        {tile.styleTag}
      </span>
      {tile.free && (
        <span className="absolute right-2 top-2 rotate-3 rounded-full bg-volt px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-black">
          free
        </span>
      )}
    </div>
  );
}

function MarqueeRow({
  tiles,
  speed,
  reverse,
  className,
}: {
  tiles: Tile[];
  speed: string;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={'rp-marquee ' + (className ?? '')}>
      <div
        className="rp-marquee-track gap-4 pr-4"
        style={{ ['--speed' as string]: speed }}
        {...(reverse ? { 'data-reverse': '' } : {})}
      >
        {tiles.map((tile, i) => (
          <TileCard key={`${tile.slug}-${i}`} tile={tile} />
        ))}
        <div aria-hidden className="flex gap-4 pr-4">
          {tiles.map((tile, i) => (
            <TileCard key={`dup-${tile.slug}-${i}`} tile={tile} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RotLibraryWall() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Reduced motion: leave every tile on its poster, never fetch an mp4.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const videos = Array.from(root.querySelectorAll<HTMLVideoElement>('video[data-rp-tile]'));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            // preload="none" means the first play() is also the first fetch.
            void video.play().catch(() => {
              /* autoplay blocked or torn down mid-flight — poster stands in */
            });
          } else {
            video.pause();
          }
        }
      },
      // Start a tile just before it slides in, drop it just after it leaves.
      { root: null, rootMargin: '200px', threshold: 0 },
    );
    videos.forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="space-y-4">
      <MarqueeRow tiles={ROW_ONE} speed="45s" />
      <MarqueeRow tiles={ROW_TWO} speed="61s" reverse className="-ml-[140px]" />
    </div>
  );
}

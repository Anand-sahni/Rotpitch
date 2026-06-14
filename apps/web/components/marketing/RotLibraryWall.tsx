import type { CSSProperties } from 'react';

/**
 * "Pick your poison" — a full-bleed double marquee of background-loop tiles.
 * Tiles are pure-CSS stand-ins (palette-only patterns, no media) so the wall
 * costs nothing to load. Rows scroll in opposite directions at mismatched
 * speeds; hover pauses a row (rp-marquee in globals.css). Under
 * reduced-motion the rows freeze on their first copy.
 */

interface Tile {
  name: string;
  styleTag: string;
  free?: boolean;
  custom?: boolean;
  art: CSSProperties;
}

const ART = {
  stripesCyan: {
    backgroundImage:
      'repeating-linear-gradient(115deg, rgba(61,240,200,0.22) 0 18px, rgba(61,240,200,0.04) 18px 44px)',
  },
  blobsViolet: {
    backgroundImage:
      'radial-gradient(circle at 30% 40%, rgba(157,123,255,0.38) 0%, transparent 55%), radial-gradient(circle at 78% 72%, rgba(157,123,255,0.22) 0%, transparent 45%)',
  },
  rings: {
    backgroundImage:
      'repeating-radial-gradient(circle at 50% 58%, rgba(244,244,246,0.14) 0 2px, transparent 2px 24px)',
  },
  sandVolt: {
    backgroundImage:
      'radial-gradient(circle, rgba(203,255,61,0.28) 1.5px, transparent 1.5px)',
    backgroundSize: '22px 18px',
  },
  blocksMagenta: {
    backgroundImage:
      'repeating-linear-gradient(0deg, rgba(255,92,157,0.16) 0 14px, transparent 14px 34px), repeating-linear-gradient(90deg, rgba(255,92,157,0.16) 0 14px, transparent 14px 34px)',
  },
  laneLines: {
    backgroundImage:
      'repeating-linear-gradient(180deg, rgba(77,168,255,0.2) 0 3px, transparent 3px 30px)',
  },
  zigzag: {
    backgroundImage:
      'repeating-linear-gradient(135deg, rgba(61,240,200,0.16) 0 12px, transparent 12px 24px), repeating-linear-gradient(45deg, rgba(61,240,200,0.1) 0 12px, transparent 12px 24px)',
  },
  orbsWarm: {
    backgroundImage:
      'radial-gradient(circle at 25% 70%, rgba(255,178,62,0.24) 0%, transparent 40%), radial-gradient(circle at 70% 30%, rgba(255,178,62,0.14) 0%, transparent 45%)',
  },
} satisfies Record<string, CSSProperties>;

const ROW_ONE: Tile[] = [
  { name: 'subway_runner.mp4', styleTag: 'gameplay', free: true, art: ART.stripesCyan },
  { name: 'slime_asmr.mp4', styleTag: 'asmr', free: true, art: ART.blobsViolet },
  { name: 'hydraulic_press.mp4', styleTag: 'asmr', free: true, art: ART.rings },
  { name: 'kinetic_sand.mp4', styleTag: 'asmr', free: true, art: ART.sandVolt },
  { name: 'tower_stack.mp4', styleTag: 'gameplay', free: true, art: ART.blocksMagenta },
  { name: 'night_drive.mp4', styleTag: 'abstract', art: ART.laneLines },
];

const ROW_TWO: Tile[] = [
  { name: 'parkour_vibe.mp4', styleTag: 'gameplay', art: ART.zigzag },
  { name: 'soap_cutting.mp4', styleTag: 'asmr', art: ART.orbsWarm },
  { name: 'marble_run.mp4', styleTag: 'gameplay', art: ART.rings },
  { name: 'upload_your_own.mp4', styleTag: 'custom', custom: true, art: {} },
  { name: 'domino_chain.mp4', styleTag: 'asmr', art: ART.blocksMagenta },
  { name: 'lava_flow.mp4', styleTag: 'abstract', art: ART.blobsViolet },
];

function TileCard({ tile }: { tile: Tile }) {
  return (
    <div
      className={
        'relative aspect-video w-[240px] shrink-0 overflow-hidden rounded-md bg-card transition-transform duration-200 hover:scale-[1.04] sm:w-[280px] ' +
        (tile.custom
          ? 'border-2 border-dashed border-border-strong'
          : 'border border-border hover:border-volt/50')
      }
    >
      {tile.custom ? (
        <div className="grid h-full place-items-center px-4 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-t2">
            + upload_your_own.mp4
          </span>
        </div>
      ) : (
        <div className="absolute inset-0" style={tile.art} />
      )}
      <span className="absolute bottom-2 left-2 rounded-xs bg-black/55 px-1.5 py-0.5 font-mono text-[10px] lowercase tracking-wide text-t1">
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
      {tile.custom && (
        <span className="absolute right-2 top-2 -rotate-2 rounded-full border border-violet px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-violet">
          paid
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
        {tiles.map((tile) => (
          <TileCard key={tile.name} tile={tile} />
        ))}
        <div aria-hidden className="flex gap-4 pr-4">
          {tiles.map((tile) => (
            <TileCard key={`dup-${tile.name}`} tile={tile} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RotLibraryWall() {
  return (
    <div className="space-y-4">
      <MarqueeRow tiles={ROW_ONE} speed="45s" />
      <MarqueeRow tiles={ROW_TWO} speed="61s" reverse className="-ml-[140px]" />
    </div>
  );
}

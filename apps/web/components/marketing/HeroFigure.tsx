import { cn } from '@/lib/cn';

/**
 * FIG.01 — "The Hockey Stick". The hero background as a lab figure drawn in
 * light: the gray dotted decay of raw_demo.mp4 flatlining at 4%, and the same
 * demo after treatment — a Signal-gradient curve that sags, turns, and rips
 * up to 97%. One ambient system: a comet pulse rides the volt curve on a 7s
 * loop (rp-pulse, stroke-dash travel) and detonates the endpoint node on
 * arrival (rp-node-flare). Both rest hidden, so reduced-motion leaves a
 * finished still — the chart at full steady glow.
 *
 * Geometry contract: the SVG stretches (preserveAspectRatio="none") inside
 * the right-anchored figure wrapper, so viewBox coords (1000×800) map
 * linearly to percentages — every HTML annotation is pinned at x/10% · y/8%
 * and stays registered with the paths at any viewport. Pure markup, no
 * client JS.
 */

/** The volt curve — shared by the glow strokes, the fog fill, and the pulse. */
const VOLT_PATH = 'M140 300 C250 392 340 436 432 424 C560 408 770 300 940 130';
/** The "before": exponential decay to a flatline just above the baseline. */
const DECAY_PATH = 'M140 300 C225 432 305 545 415 588 C505 622 620 614 958 613';
/** Light haze under the volt curve — the curve's lower edge, closed ~140 units down. */
const FOG_PATH = `${VOLT_PATH} L940 340 C780 470 580 556 432 556 C340 556 250 470 140 416 Z`;

const BASELINE_TICKS = Array.from({ length: 9 }, (_, i) => `M${140 + i * 100} 624 v7`).join(' ');
/** Mono time labels under every other tick (left % = viewBox x / 10). */
const AXIS_LABELS = ['0s', '2s', '4s', '6s', '8s'];

/** Endpoint node position: viewBox (940, 130) → 94% / 16.25%. */
const NODE_LEFT = '94%';
const NODE_TOP = '16.25%';

function Crosshair({ className }: { className: string }) {
  return (
    <span className={cn('absolute h-3 w-3', className)}>
      <span className="absolute left-0 top-1/2 h-px w-full bg-border-strong" />
      <span className="absolute left-1/2 top-0 h-full w-px bg-border-strong" />
    </span>
  );
}

export function HeroFigure() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-base">
      {/* atmosphere: upper-left lift + the Signal bloom the curve climbs toward */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 30% 18%, #0f0f12 0%, rgba(15, 15, 18, 0) 55%),' +
            'radial-gradient(58% 48% at 78% 26%, rgba(61, 240, 200, 0.07) 0%, transparent 70%),' +
            'radial-gradient(46% 38% at 84% 22%, rgba(203, 255, 61, 0.06) 0%, transparent 70%)',
        }}
      />

      {/* ghost graticule — materializes on the right, gone behind the copy */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, var(--border) 0 1px, transparent 1px 96px),' +
            'repeating-linear-gradient(90deg, var(--border) 0 1px, transparent 1px 96px)',
          maskImage: 'linear-gradient(105deg, transparent 32%, black 64%)',
          WebkitMaskImage: 'linear-gradient(105deg, transparent 32%, black 64%)',
        }}
      />

      {/* ── the figure ── */}
      <div className="absolute inset-y-0 right-0 w-[68%] min-w-[640px] max-lg:opacity-75">
        <svg
          className="h-full w-full"
          viewBox="0 0 1000 800"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient
              id="rp-signal"
              gradientUnits="userSpaceOnUse"
              x1="140"
              y1="300"
              x2="940"
              y2="130"
            >
              <stop offset="0" stopColor="#3df0c8" />
              <stop offset="1" stopColor="#cbff3d" />
            </linearGradient>
            <linearGradient id="rp-fog" gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="570">
              <stop offset="0" stopColor="#3df0c8" stopOpacity="0.11" />
              <stop offset="1" stopColor="#3df0c8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* baseline + ticks */}
          <path d="M100 624 H960" stroke="#35353f" strokeWidth="1" />
          <path d={BASELINE_TICKS} stroke="#35353f" strokeWidth="1" opacity="0.9" />

          {/* haze under the volt curve */}
          <path d={FOG_PATH} fill="url(#rp-fog)" />

          {/* the before: gray dotted decay */}
          <path
            d={DECAY_PATH}
            stroke="#66666f"
            strokeWidth="1.5"
            strokeDasharray="2 6"
            opacity="0.55"
          />

          {/* the after: one light streak, bloomed by re-stroking (no filters) */}
          <path d={VOLT_PATH} stroke="url(#rp-signal)" strokeWidth="18" strokeOpacity="0.07" />
          <path d={VOLT_PATH} stroke="url(#rp-signal)" strokeWidth="7" strokeOpacity="0.16" />
          <path d={VOLT_PATH} stroke="url(#rp-signal)" strokeWidth="2.5" />

          {/* comet pulse — halo + core ride the same dash clock */}
          <path
            d={VOLT_PATH}
            pathLength={200}
            className="rp-pulse"
            stroke="#cbff3d"
            strokeWidth="9"
            strokeOpacity="0.25"
            strokeLinecap="round"
          />
          <path
            d={VOLT_PATH}
            pathLength={200}
            className="rp-pulse"
            stroke="#efffc4"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>

        {/* endpoint node + detonation */}
        <span
          className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2"
          style={{ left: NODE_LEFT, top: NODE_TOP }}
        >
          <span className="rp-node-flare absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(203,255,61,0.5)_0%,transparent_70%)]" />
          <span className="absolute -inset-2 rounded-full border border-volt/40" />
          <span className="absolute inset-0 rounded-full bg-volt shadow-[0_0_12px_rgba(203,255,61,0.9),0_0_42px_rgba(203,255,61,0.45)]" />
        </span>

        {/* the only two annotated values — discipline keeps this a figure, not a dashboard */}
        <div
          className="absolute -translate-x-[calc(100%+16px)] -translate-y-1/2 text-right font-mono"
          style={{ left: NODE_LEFT, top: NODE_TOP }}
        >
          <p className="text-[12px] lowercase tracking-[0.18em] text-volt">retention: 97%</p>
          <p className="mt-1 text-[10px] lowercase tracking-[0.14em] text-t3">
            fig.01 / the_machine_works
          </p>
        </div>
        <p className="absolute left-[95.5%] top-[74%] -translate-x-full -translate-y-full font-mono text-[11px] lowercase tracking-[0.14em] text-t3">
          raw_demo.mp4 — 4%
        </p>

        {/* axis time labels (left % = tick x / 10) */}
        {AXIS_LABELS.map((label, i) => (
          <span
            key={label}
            className="absolute top-[80.5%] hidden -translate-x-1/2 font-mono text-[10px] text-t4 md:block"
            style={{ left: `${14 + i * 20}%` }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* left-protect scrim under the headline, then the cinematic vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(9, 9, 11, 0.92) 0%, rgba(9, 9, 11, 0.58) 36%, rgba(9, 9, 11, 0.16) 62%, transparent 80%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(90% 85% at 50% 46%, transparent 52%, rgba(0, 0, 0, 0.5) 100%)',
        }}
      />

      {/* lab-plate furniture: inset frame, corner crosshairs, deadpan edge labels */}
      <div className="absolute inset-5 border border-border/50">
        <Crosshair className="-left-1.5 -top-1.5" />
        <Crosshair className="-right-1.5 -top-1.5" />
        <Crosshair className="-bottom-1.5 -left-1.5" />
        <Crosshair className="-bottom-1.5 -right-1.5" />
      </div>
      <p className="absolute right-9 top-8 hidden font-mono text-[10px] lowercase tracking-[0.18em] text-t4 md:block">
        canvas 1080×1920 · 9:16 · yuv420p
      </p>
      <p className="absolute bottom-8 right-9 hidden font-mono text-[10px] lowercase tracking-[0.18em] text-t4 md:block">
        tc 00:00:08:00 — typical render
      </p>
      {/* anchored at 60% so the column clears the endpoint node + flare airspace down to 1280w */}
      <p className="absolute right-8 top-[60%] hidden -translate-y-1/2 font-mono text-[10px] lowercase tracking-[0.18em] text-t4 [writing-mode:vertical-rl] lg:block">
        specimen: raw_demo.mp4 · treatment: brainrot · ink: volt #cbff3d
      </p>
    </div>
  );
}

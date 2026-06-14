import Link from 'next/link';
import {
  ArrowRight,
  Captions,
  Check,
  FileSearch,
  Layers,
  ListOrdered,
  Mic,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { Brand } from '@/components/Brand';
import { cn } from '@/lib/cn';
import { BeforeAfterSlider } from '@/components/marketing/BeforeAfterSlider';
import { CaptionLoop } from '@/components/marketing/CaptionLoop';
import { FAQ } from '@/components/marketing/FAQ';
import { HeroFigure } from '@/components/marketing/HeroFigure';
import { RotLibraryWall } from '@/components/marketing/RotLibraryWall';
import { Reveal } from '@/components/marketing/Reveal';
import {
  BATCH_MAX,
  BATCH_MIN,
  CREDIT_COST_PER_VIDEO,
  MAX_INPUT_DURATION_SEC,
  MAX_UPLOAD_BYTES,
  PLANS,
  PLAN_IDS,
  type PlanId,
} from '@rotpitch/shared';

/**
 * RotPitch marketing landing — "The Retention Machine".
 *
 * The page is a demonstration of the product: a precision-built attention
 * machine that openly performs retention hacks on the visitor, every trick
 * labeled in deadpan JetBrains Mono like a lab specimen. Huge Syne makes the
 * claims; mono states the facts; DM Sans plays it straight. Pricing renders
 * from the real PLANS constant so the page never misrepresents what ships.
 *
 * Motion is rationed: at most one ambient loop per viewport (ticker, hero
 * figure pulse, pipeline packet, library marquees, caption loop, final
 * marquee), one-shot scroll reveals via <Reveal>, and the global
 * reduced-motion rule freezes every loop on a meaningful resting frame.
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

const SPECS = [
  { value: '~8s', label: 'TYPICAL RENDER' },
  {
    value: `${MAX_INPUT_DURATION_SEC}s / ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB`,
    label: 'MAX INPUT',
  },
  { value: '9:16 + 16:9', label: 'OUTPUT FORMATS' },
  { value: String(CREDIT_COST_PER_VIDEO), label: 'CREDIT PER VIDEO' },
];

const PIPELINE = [
  { icon: Upload, name: 'Upload', tech: 'raw_demo.mp4' },
  { icon: FileSearch, name: 'Probe', tech: 'ffprobe' },
  { icon: ListOrdered, name: 'Queue', tech: 'bullmq + redis' },
  { icon: Layers, name: 'Composite', tech: 'ffmpeg' },
  { icon: Captions, name: 'Captions', tech: 'whisper + libass', tag: 'LIVE' },
  { icon: Send, name: 'Ship', tech: 's3 · presigned' },
] as const;

const TRUTH_ROWS = [
  ['9:16 VERTICAL', 'ALL PLANS'],
  ['16:9 HORIZONTAL', 'POPULAR & PRO'],
  ['WATERMARK', 'FREE PLAN ONLY'],
  ['FAILED RENDER', 'CREDIT AUTO-REFUNDED'],
  ['MAX INPUT', `${MAX_INPUT_DURATION_SEC}s / ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB`],
  ['AUTO GENERATE', `${BATCH_MIN}–${BATCH_MAX} VARIANTS / UPLOAD`],
];

const PLAN_CTA: Record<PlanId, string> = {
  free: 'Get started',
  basic: 'Go Basic',
  popular: 'Start scaling',
  pro: 'Get Pro',
};

function planRows(id: PlanId): { ok: boolean; label: string; tag?: string }[] {
  const f = PLANS[id].features;
  return [
    {
      ok: true,
      label:
        f.backgroundStyles === 'all'
          ? 'ALL BACKGROUNDS + YOUR OWN'
          : `${f.backgroundStyles} BACKGROUND STYLES`,
    },
    { ok: f.autoCaptions, label: 'AUTO CAPTIONS' },
    { ok: f.aiVoiceover, label: 'AI VOICEOVER', tag: f.aiVoiceover ? 'SOON' : undefined },
    {
      ok: true,
      label: f.formats.includes('horizontal') ? '9:16 + 16:9 EXPORT' : '9:16 VERTICAL EXPORT',
    },
    { ok: !f.watermark, label: f.watermark ? 'WATERMARK — ALWAYS' : 'NO WATERMARK' },
    { ok: f.autoGenerate, label: `AUTO GENERATE (${BATCH_MIN}–${BATCH_MAX})` },
    { ok: f.priorityQueue, label: 'PRIORITY RENDER QUEUE' },
  ];
}

/** Hero words that punch in like live captions (rp-word, one-shot). */
function PunchWords({
  words,
  start,
  className,
}: {
  words: string[];
  start: number;
  className?: string;
}) {
  return (
    <>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className={cn('rp-word mr-[0.22em]', className)}
          style={{ ['--d' as string]: `${(start + i * 0.18).toFixed(2)}s` }}
        >
          {word}
        </span>
      ))}
    </>
  );
}

function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'font-mono text-[11px] uppercase tracking-[0.18em] text-t3',
        className,
      )}
    >
      {children}
    </p>
  );
}

/* Pinned clear of the figure: the curve's endpoint node + label own the top-
 * right corner, the baseline + time labels own the lower-right band. */
const HERO_STICKERS = [
  { text: '<60s', pos: 'right-[17%] top-[28%]', tilt: '-6deg', drift: '5.2s', d: '2.1s' },
  { text: '0 EDITS', pos: 'right-[31%] top-[44%]', tilt: '3deg', drift: '6.4s', d: '2.3s' },
  { text: '9:16 + 16:9', pos: 'right-[8%] top-[57%]', tilt: '-3deg', drift: '7.1s', d: '2.5s' },
  { text: 'NO TIMELINE. EVER.', pos: 'right-[22%] bottom-[12%]', tilt: '2deg', drift: '5.8s', d: '2.7s' },
];

const MANTRA = ['STOP', 'EDITING', '—', 'START', 'POSTING', '—'];

export default function HomePage() {
  return (
    <div className="font-dm">
      {/* ── Session HUD: ticker + frosted nav ───────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-50">
        <div className="rp-marquee h-7 border-b border-border bg-surface">
          <div
            className="rp-marquee-track items-center"
            style={{ ['--speed' as string]: '40s' }}
          >
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
              <a href="#pipeline" className="text-t2 transition-colors hover:text-t1">
                How
              </a>
              <a href="#library" className="text-t2 transition-colors hover:text-t1">
                Backgrounds
              </a>
              <a href="#pricing" className="text-t2 transition-colors hover:text-t1">
                Pricing
              </a>
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
                className="signal-gradient rounded-sm px-4 py-2 font-bold text-black transition-transform hover:scale-105 active:scale-95"
              >
                Start free
              </Link>
            </div>
          </div>
        </nav>
      </div>

      <main className="pt-[92px]">
        {/* ── SEC.01 — Hero: fig.01, the hockey stick ────────────────────── */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="relative min-h-[calc(100vh-92px)]">
            <HeroFigure />

            {/* overlay copy — the figure behind is decorative; only CTAs take the pointer */}
            <div className="pointer-events-none relative z-10 mx-auto flex min-h-[calc(100vh-92px)] w-full max-w-[1280px] flex-col justify-center px-6 py-24">
              <div className="max-w-[860px]">
                <p
                  className="rp-fade-up mb-5 font-mono text-[11px] uppercase tracking-[0.18em] text-t3"
                  style={{ ['--d' as string]: '0.1s' }}
                >
                  <span className="text-volt">sec.01</span> / fig.01 — retention, before &amp;
                  after treatment
                </p>
                {/* Syne XBold runs ~0.94em/char — four designed lines fit the 860px box
                    where three at 8vw never could (longest line is ~8.5em wide). */}
                <h1 className="mb-6 font-syne text-[clamp(2.4rem,5.5vw,5rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.02em]">
                  <span className="block">
                    <PunchWords words={['Your', 'demo']} start={0.35} className="rp-burned" />
                  </span>
                  <span className="block">
                    <PunchWords words={['is', 'boring.']} start={0.85} className="rp-burned" />
                  </span>
                  <span className="block">
                    <PunchWords
                      words={['We', 'can']}
                      start={1.45}
                      className="text-volt [text-shadow:0_2px_0_rgba(0,0,0,0.85),0_6px_18px_rgba(0,0,0,0.6)]"
                    />
                  </span>
                  <span className="block">
                    <PunchWords
                      words={['fix', 'that.']}
                      start={1.81}
                      className="text-volt [text-shadow:0_2px_0_rgba(0,0,0,0.85),0_6px_18px_rgba(0,0,0,0.6)]"
                    />
                  </span>
                </h1>
                <div className="rp-fade-up" style={{ ['--d' as string]: '2.1s' }}>
                  <p className="mb-2 max-w-lg text-lg leading-relaxed text-t1 [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
                    RotPitch fuses the demo you already have with scientifically* irresistible
                    backgrounds and burns the captions in. Post-ready in under 60 seconds.
                  </p>
                  <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-t3">
                    *not science. it works anyway.
                  </p>
                  <div className="pointer-events-auto flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <Link
                      href="/signup"
                      className="signal-gradient flex items-center gap-2 rounded-md px-7 py-4 text-lg font-bold text-black transition-shadow hover:shadow-[0_0_30px_rgba(203,255,61,0.3)]"
                    >
                      Weaponize my demo <ArrowRight className="h-5 w-5" strokeWidth={2} />
                    </Link>
                    <a
                      href="#diff"
                      className="rounded-md border border-border-strong px-6 py-4 font-bold text-t1 transition-colors hover:border-volt hover:text-volt"
                    >
                      Watch one rot ↓
                    </a>
                  </div>
                  <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-t3">
                    no card · 1 free credit · never expires
                  </p>
                </div>
              </div>
            </div>

            {/* sticker pills */}
            <div className="pointer-events-none absolute inset-0 z-10 hidden lg:block" aria-hidden>
              {HERO_STICKERS.map((s) => (
                <span
                  key={s.text}
                  className={cn('rp-fade-up absolute', s.pos)}
                  style={{ ['--d' as string]: s.d }}
                >
                  <span
                    className="rp-drift inline-block rounded-full border-[1.5px] border-border-strong bg-base/90 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-t1"
                    style={{ ['--tilt' as string]: s.tilt, ['--speed' as string]: s.drift }}
                  >
                    {s.text}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── SEC.02 — Spec strip ────────────────────────────────────────── */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-[1280px] grid-cols-2 lg:grid-cols-4">
            {SPECS.map((spec, i) => (
              <Reveal
                key={spec.label}
                className={cn(
                  'border-border px-6 py-8',
                  i > 0 && 'border-l max-lg:[&:nth-child(3)]:border-l-0',
                  i >= 2 && 'max-lg:border-t',
                )}
                style={{ ['--d' as string]: `${i * 90}ms` }}
              >
                <p className="font-mono text-[28px] font-medium text-t1 [font-variant-numeric:tabular-nums]">
                  {spec.value}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-t3">
                  {spec.label}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── SEC.03 — Pipeline ──────────────────────────────────────────── */}
        <section id="pipeline" className="mx-auto max-w-[1280px] scroll-mt-28 px-6 py-24">
          <Reveal>
            <Kicker className="mb-4">
              <span className="text-volt">sec.03</span> / pipeline
            </Kicker>
            <h2 className="mb-3 max-w-[16ch] font-syne text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.02em] text-t1">
              No timeline. A pipeline.
            </h2>
            <p className="mb-12 max-w-[52ch] text-t2">
              Your clip takes the same path every time: probed, queued, composited, captioned,
              shipped. You never see a keyframe.
            </p>
          </Reveal>

          {/* rail + traveling packet */}
          <Reveal className="relative">
            <div className="relative mb-6 hidden h-px bg-border md:block">
              <div className="rp-packet pointer-events-none absolute inset-y-0 w-full">
                <span className="absolute -top-[3px] left-0 h-[7px] w-[7px] rounded-full bg-volt shadow-[0_0_10px_rgba(203,255,61,0.8)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {PIPELINE.map((step) => (
                <div
                  key={step.name}
                  className="rounded-xs border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <step.icon className="h-5 w-5 text-t2" strokeWidth={1.5} />
                    {'tag' in step && step.tag && (
                      <span className="rounded-full bg-volt-dim px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-volt">
                        {step.tag}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-t1">{step.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] lowercase tracking-wide text-t3">
                    {step.tech}
                  </p>
                </div>
              ))}
            </div>
            {/* honest roadmap: the unshipped step sits off the rail, dashed */}
            <div className="mt-3 inline-flex items-center gap-3 rounded-xs border border-dashed border-border-strong px-4 py-3">
              <Mic className="h-5 w-5 text-t3" strokeWidth={1.5} />
              <span className="font-medium text-t2">Voiceover</span>
              <span className="font-mono text-[10px] lowercase tracking-wide text-t4">
                elevenlabs
              </span>
              <span className="rounded-full border border-violet px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-violet">
                coming soon
              </span>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 text-sm text-t2 md:grid-cols-3">
            {[
              `ffprobe rejects anything over ${MAX_INPUT_DURATION_SEC} seconds before it costs you a credit.`,
              'Whisper transcribes; libass burns it in. Word for word, styled, bottom-center.',
              'Failed render? The credit walks itself back. Automatically. Logged.',
            ].map((line, i) => (
              <Reveal key={line} style={{ ['--d' as string]: `${i * 100}ms` }}>
                <p className="max-w-[36ch] border-l border-border-strong pl-4">{line}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── SEC.04 — Output diff ───────────────────────────────────────── */}
        <section id="diff" className="scroll-mt-28 border-y border-border bg-surface py-24">
          <div className="mx-auto max-w-[1280px] px-6">
            <Reveal className="mb-10">
              <Kicker className="mb-4">
                <span className="text-volt">sec.04</span> / output_diff
              </Kicker>
              <h2 className="mb-3 font-syne text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.02em] text-t1">
                Same demo. Different physics.
              </h2>
              <p className="max-w-[52ch] text-t2">
                Drag the line. The left side is what you made. The right side is what gets watched.
              </p>
            </Reveal>
            <Reveal>
              <div className="mx-auto max-w-4xl">
                <div className="flex items-center justify-between rounded-t-md border border-b-0 border-border bg-card px-4 py-2.5 font-mono text-[11px] lowercase tracking-wide">
                  <span className="text-t3">input.mp4 · 0_views_energy</span>
                  <span className="flex items-center gap-2 text-t1">
                    output.mp4 · feed_ready
                    <span className="rounded-xs bg-volt-dim px-1.5 py-0.5 text-[9px] font-bold uppercase text-volt">
                      +captions +gameplay
                    </span>
                  </span>
                </div>
                <BeforeAfterSlider />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── SEC.05 — The Rot Library ───────────────────────────────────── */}
        <section id="library" className="scroll-mt-28 overflow-hidden py-24">
          <Reveal className="relative z-10 mx-auto mb-10 max-w-[1280px] px-6 text-center">
            <Kicker className="mb-4">
              <span className="text-volt">sec.05</span> / rot_library
            </Kicker>
            <h2 className="mb-3 font-syne text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.02em] text-t1">
              Pick your poison.
            </h2>
            <p className="mx-auto max-w-[56ch] text-t2">
              A live library of high-retention loops — gameplay, ASMR, abstract. Free plan gets 5.
              Paid gets the whole pharmacy, plus bring-your-own rot.
            </p>
          </Reveal>
          <RotLibraryWall />
          <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-t3">
            free plan: first 5 styles · paid: full catalog + your own loops
          </p>
        </section>

        {/* ── SEC.06 — The attention arsenal (bento) ─────────────────────── */}
        <section className="border-y border-border bg-surface py-24">
          <div className="mx-auto max-w-[1280px] px-6">
            <Reveal className="mb-12">
              <Kicker className="mb-4">
                <span className="text-volt">sec.06</span> / arsenal
              </Kicker>
              <h2 className="font-syne text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.02em] text-t1">
                The attention arsenal.
              </h2>
            </Reveal>

            <div className="grid gap-6 md:grid-cols-12">
              {/* A — captions, LIVE */}
              <Reveal className="md:col-span-7">
                <div className="flex h-full flex-col gap-6 rounded-lg border border-border bg-card p-6 sm:flex-row">
                  <div className="flex-1">
                    <span className="rounded-full bg-volt-dim px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-volt">
                      live
                    </span>
                    <h3 className="mt-4 font-syne text-2xl font-bold tracking-tight text-t1">
                      Captions that read themselves.
                    </h3>
                    <p className="mt-3 text-t2">
                      Whisper hears your demo; libass burns the words in — styled, timed, bottom
                      center. No font shopping, no manual syncing. Silent demo? It renders clean,
                      no charge for what isn&apos;t there.
                    </p>
                  </div>
                  <div className="h-[320px] shrink-0">
                    <CaptionLoop />
                  </div>
                </div>
              </Reveal>

              {/* B — Auto Generate + the honesty ledger */}
              <Reveal className="md:col-span-5" style={{ ['--d' as string]: '100ms' }}>
                <div className="group flex h-full flex-col rounded-lg border border-border bg-card p-6">
                  <h3 className="font-syne text-2xl font-bold tracking-tight text-t1">
                    One upload. Five contenders.
                  </h3>
                  <p className="mt-3 text-t2">
                    Auto Generate renders {BATCH_MIN}–{BATCH_MAX} variants on different backgrounds
                    so the feed picks the winner, not your gut.
                  </p>
                  {/* variant fan */}
                  <div className="relative my-7 h-28" aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-1"
                        style={{
                          transform: `translateX(${i * 40}px) rotate(${(i - 2) * 4}deg)`,
                          left: 'calc(50% - 130px)',
                        }}
                      >
                        <div
                          className="grid h-24 w-[60px] place-items-end rounded-xs border border-border-strong bg-elevated p-1.5 transition-transform duration-300 group-hover:-translate-y-1.5"
                          style={{ transitionDelay: `${i * 40}ms` }}
                        >
                          <span className="font-mono text-[8px] uppercase text-t3">
                            var_0{i + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* the ledger receipt */}
                  <div className="mt-auto overflow-hidden rounded-xs border border-border bg-base font-mono text-[11px] uppercase tracking-wide">
                    <p className="border-b border-border px-3 py-2 text-[9px] tracking-[0.18em] text-t4">
                      credit_ledger — real behavior, not a metaphor
                    </p>
                    <p className="border-b border-border px-3 py-2 text-t2">
                      −5 · auto_generate · 5 variants queued
                    </p>
                    <p className="border-b border-border px-3 py-2 text-t1">
                      ✓ var_01…var_04 · rendered
                    </p>
                    <p className="border-b border-border px-3 py-2 text-error">
                      ✕ var_05 · failed — input 61s &gt; 60s
                    </p>
                    <p className="px-3 py-2 text-volt">+1 · auto_refund · logged</p>
                  </div>
                </div>
              </Reveal>

              {/* C — voiceover: deliberately still */}
              <Reveal className="md:col-span-4" style={{ ['--d' as string]: '60ms' }}>
                <div className="flex h-full flex-col rounded-lg border border-border bg-surface p-6">
                  <span className="self-start rounded-full border border-violet px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-violet">
                    coming soon
                  </span>
                  <h3 className="mt-4 font-syne text-2xl font-bold tracking-tight text-t2">
                    AI voiceover.
                  </h3>
                  <p className="mt-3 text-t3">
                    Your demo&apos;s own transcript, re-voiced by studio-grade AI. No script, no
                    microphone. Nothing here moves because it hasn&apos;t shipped — we only
                    animate what&apos;s real.
                  </p>
                </div>
              </Reveal>

              {/* D — the truth table */}
              <Reveal className="md:col-span-8" style={{ ['--d' as string]: '140ms' }}>
                <div className="h-full rounded-lg border border-border bg-card p-6">
                  <h3 className="font-syne text-2xl font-bold tracking-tight text-t1">
                    The fine print, in lights.
                  </h3>
                  <div className="mt-5 grid gap-x-10 sm:grid-cols-2">
                    {TRUTH_ROWS.map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 font-mono text-[11px] uppercase tracking-wide"
                      >
                        <span className="text-t3">{label}</span>
                        <span className="text-right text-t1">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── SEC.07 — Pricing: the calm room ────────────────────────────── */}
        <section id="pricing" className="mx-auto max-w-[1280px] scroll-mt-28 px-6 py-24">
          <Reveal className="mb-12">
            <Kicker className="mb-4">
              <span className="text-volt">sec.07</span> / insert_coin — 1 credit = 1 rendered video
            </Kicker>
            <h2 className="mb-3 font-syne text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.02em] text-t1">
              Pay for output, not software.
            </h2>
            <p className="max-w-[56ch] text-t2">
              Every plan is just credits. One credit, one finished video — single render or batch.
              Failed renders refund themselves.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PLAN_IDS.map((id, i) => {
              const plan = PLANS[id];
              const isPopular = id === 'popular';
              const perVideo =
                plan.priceUsd === 0
                  ? '$0 · forever'
                  : `≈ $${(plan.priceUsd / plan.monthlyCredits).toFixed(2)} / video`;
              return (
                <Reveal key={id} style={{ ['--d' as string]: `${i * 80}ms` }}>
                  <div
                    className={cn(
                      'relative flex h-full flex-col p-6',
                      isPopular
                        ? 'nebula-border'
                        : 'glass-panel rounded-lg transition-colors hover:border-volt/40',
                    )}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 right-5 rotate-[-4deg] rounded-full bg-volt px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-black shadow-lg">
                        most popular
                      </span>
                    )}
                    <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-t2">
                      {plan.name}
                    </span>
                    <div className="mt-3 flex items-baseline gap-1 font-mono [font-variant-numeric:tabular-nums]">
                      <span className="text-[38px] font-medium leading-none text-t1">
                        ${plan.priceUsd === 0 ? '0' : plan.priceUsd}
                      </span>
                      <span className="text-[12px] text-t3">/mo</span>
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-volt">
                      {perVideo}
                    </p>
                    <div className="mt-5 flex items-baseline gap-2 border-y border-border py-3 font-mono">
                      <span className="text-[32px] font-medium leading-none text-t1">
                        {plan.monthlyCredits}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-t3">
                        {plan.creditsExpire ? 'credits / mo' : 'credit · never expires'}
                      </span>
                    </div>
                    <ul className="mb-8 mt-5 space-y-2.5">
                      {planRows(id).map((row) => (
                        <li
                          key={row.label}
                          className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide"
                        >
                          {row.ok ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-volt" strokeWidth={2} />
                          ) : (
                            <X className="h-3.5 w-3.5 shrink-0 text-t4" strokeWidth={2} />
                          )}
                          <span className={row.ok ? 'text-t1' : 'text-t4'}>{row.label}</span>
                          {row.tag && (
                            <span className="rounded-full border border-violet px-1.5 py-px text-[9px] text-violet">
                              {row.tag}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/signup"
                      className={cn(
                        'mt-auto w-full rounded-md py-3 text-center font-bold transition-all',
                        isPopular
                          ? 'bg-volt text-black hover:bg-volt-hover'
                          : 'border border-border-strong text-t1 hover:bg-white hover:text-black',
                      )}
                    >
                      {PLAN_CTA[id]}
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-t3">
            free credit never expires · paid credits reset monthly · no rollover — we&apos;d rather
            say it here than in the faq
          </p>
        </section>

        {/* ── SEC.08 — Debrief (FAQ) ─────────────────────────────────────── */}
        <section className="mx-auto max-w-[920px] px-6 py-24">
          <Reveal className="mb-10">
            <Kicker className="mb-4">
              <span className="text-volt">sec.08</span> / debrief
            </Kicker>
            <h2 className="font-syne text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.02em] text-t1">
              Questions, answered plainly.
            </h2>
          </Reveal>
          <Reveal>
            <FAQ />
          </Reveal>
        </section>

        {/* ── SEC.09 — The last hook ─────────────────────────────────────── */}
        <section className="relative overflow-hidden border-t border-border py-40">
          {/* outlined mega-marquee behind everything */}
          <div aria-hidden className="rp-marquee absolute inset-0 flex items-center">
            <div className="rp-marquee-track" style={{ ['--speed' as string]: '50s' }}>
              {[0, 1].map((copy) => (
                <div
                  key={copy}
                  className="flex items-center whitespace-nowrap font-syne text-[clamp(5rem,14vw,10rem)] font-extrabold uppercase leading-none tracking-[-0.02em]"
                >
                  {MANTRA.map((word, i) => (
                    <span
                      key={`${copy}-${i}`}
                      className={cn(
                        'mr-[0.35em]',
                        word === 'POSTING' ? 'text-volt' : 'rp-outline-text',
                      )}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(9,9,11,0.88)_0%,rgba(9,9,11,0.3)_75%)]"
          />
          <div className="relative z-10 mx-auto flex max-w-[760px] flex-col items-center px-6 text-center">
            <p className="mb-6 font-mono text-sm text-t2">
              $ rotpitch init<span className="rp-caret text-volt">▌</span>
            </p>
            <h2 className="mb-8 font-syne text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-tight tracking-[-0.02em] text-t1">
              Your demo deserves an audience. Sedate them properly.
            </h2>
            <Link
              href="/signup"
              className="signal-gradient flex items-center gap-2 rounded-md px-8 py-4 text-lg font-bold text-black transition-shadow hover:shadow-[0_0_30px_rgba(203,255,61,0.3)]"
            >
              Render my first video — free <ArrowRight className="h-5 w-5" strokeWidth={2} />
            </Link>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-t3">
              1 free credit · never expires · no card · watermark included (sorry)
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer: the colophon ─────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface px-6 py-16">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Brand />
              <p className="mt-4 max-w-[34ch] text-sm text-t2">
                RotPitch is not a video editor. It&apos;s a growth tool that happens to output
                video.
              </p>
            </div>
            {(
              [
                {
                  title: 'product',
                  links: [
                    ['How it works', '#pipeline'],
                    ['The rot library', '#library'],
                    ['Pricing', '#pricing'],
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
                    ['Privacy policy', '#'],
                    ['Terms of service', '#'],
                    ['Contact', '#'],
                  ],
                },
              ] as const
            ).map((col) => (
              <div key={col.title}>
                <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-t4">
                  {col.title}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      {href.startsWith('/') ? (
                        <Link
                          href={href}
                          className="text-sm text-t2 transition-colors hover:text-t1"
                        >
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
    </div>
  );
}

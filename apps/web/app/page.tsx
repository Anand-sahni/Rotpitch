import Link from 'next/link';
import {
  ArrowRight,
  Captions,
  Check,
  Heart,
  Layers,
  Menu,
  Mic,
  Play,
  Share2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Brand } from '@/components/Brand';
import { BeforeAfterSlider } from '@/components/marketing/BeforeAfterSlider';
import { FAQ } from '@/components/marketing/FAQ';
import { PLANS, PLAN_IDS, type PlanId } from '@rotpitch/shared';

/**
 * RotPitch marketing landing page.
 *
 * Ported from the Stitch design ("RotPitch Landing Page" screen) onto the
 * project design system: Lucide icons (per spec), Syne/DM Sans marketing type,
 * and real plan data from packages/shared PLANS (single source of truth) so the
 * pricing never misrepresents what the product actually ships.
 */

const PLAN_HIGHLIGHTS: Record<PlanId, string[]> = {
  free: ['1 credit — never expires', '5 background styles', 'Vertical 9:16 export', 'RotPitch watermark'],
  basic: ['20 credits / month', 'All background styles', 'Auto captions', 'No watermark'],
  popular: ['40 credits / month', 'AI voiceover (coming soon)', 'Vertical + horizontal 16:9', 'Auto Generate (2–5)'],
  pro: ['100 credits / month', 'Priority render queue', 'Everything in Popular', 'Highest render priority'],
};

const PLAN_CTA: Record<PlanId, string> = {
  free: 'Get started',
  basic: 'Go Basic',
  popular: 'Start scaling',
  pro: 'Get Pro',
};

const TESTIMONIALS = [
  {
    name: 'Alex Rivera',
    role: 'Founder @ SaaSFlow',
    quote:
      'RotPitch turned my boring demo videos into high-converting ads. We saw a 300% lift in engagement in just one week.',
    metric: '3.2M VIEWS',
    icon: TrendingUp,
  },
  {
    name: 'Sarah Jenks',
    role: 'Product Creator',
    quote:
      "I no longer spend hours in CapCut. I just upload, pick 'Parkour Vibe', and it's done. Absolutely game changing.",
    metric: '120K SAVES',
    icon: Heart,
  },
  {
    name: 'David Chen',
    role: 'Indie Hacker',
    quote:
      'The split-screen layout is pure magic. It keeps viewers hooked on the product while the bottom video keeps the energy high.',
    metric: '1.5M SHARES',
    icon: Share2,
  },
];

const FEATURES = [
  {
    icon: Captions,
    chip: 'signal',
    title: 'Auto Captions',
    body: 'AI-powered captions that follow the rhythm of your voice with high-impact kinetic typography.',
  },
  {
    icon: Mic,
    chip: 'nebula',
    title: 'AI Voiceover — coming soon',
    body: 'Swap your room audio for studio-grade AI narration. Professional tone, zero hardware required. Landing soon.',
  },
  {
    icon: Layers,
    chip: 'white',
    title: 'Auto Generate',
    body: 'Drop one recording and get up to 5 viral-ready clips in minutes — each on a different background.',
  },
] as const;

export default function HomePage() {
  return (
    <div className="font-dm">
      {/* ── Top nav (fixed, frosted) ─────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 h-20 w-full border-b border-border bg-[var(--glass)] shadow-md backdrop-blur-glass">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
          <Link href="/" aria-label="RotPitch home">
            <Brand />
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <a
              href="#pricing"
              className="font-medium text-t2 transition-colors hover:text-t1"
            >
              Pricing
            </a>
            <Link href="/login" className="font-medium text-t2 transition-colors hover:text-t1">
              Log in
            </Link>
            <Link
              href="/signup"
              className="signal-gradient rounded-sm px-4 py-2 font-bold text-black transition-transform hover:scale-105 active:scale-95"
            >
              Get started free
            </Link>
          </div>
          <button className="text-t1 md:hidden" aria-label="Open menu">
            <Menu className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      <main className="pt-20">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="aurora-mesh relative flex min-h-[90vh] items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2">
            <div className="z-10 text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-2 py-1">
                <span className="font-mono text-[12px] uppercase tracking-widest text-volt">New</span>
                <span className="font-mono text-[12px] text-t2">AI Video Splitter is live</span>
              </div>
              <h1 className="aurora-text mb-4 font-syne text-[clamp(40px,7vw,72px)] font-bold leading-[1.05] tracking-[-0.04em]">
                Turn product demos into scroll-stopping video
              </h1>
              <p className="mx-auto mb-10 max-w-lg text-[18px] leading-relaxed text-t2 lg:mx-0">
                Upload your product video, pick a vibe, post viral content in under 60 seconds. No
                timeline. No complex editor.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  href="/signup"
                  className="signal-gradient flex items-center gap-2 rounded-md px-7 py-4 text-[18px] font-bold text-black transition-shadow hover:shadow-[0_0_30px_rgba(203,255,61,0.3)]"
                >
                  Start free <ArrowRight className="h-5 w-5" strokeWidth={2} />
                </Link>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-10 w-10 rounded-full border-2 border-base bg-elevated"
                      />
                    ))}
                  </div>
                  <p className="font-mono text-[12px] text-t2">Used by 2,000+ creators</p>
                </div>
              </div>
            </div>

            {/* Phone mockup — the split-screen, living */}
            <div className="relative z-10 flex justify-center">
              <div className="relative h-[600px] w-[300px] overflow-hidden rounded-[3rem] border-[8px] border-elevated bg-black shadow-2xl">
                <div className="absolute inset-0 flex flex-col">
                  {/* Top: product demo */}
                  <div className="relative flex-1 bg-gradient-to-br from-elevated to-card">
                    <div className="absolute inset-0 grid grid-cols-5 gap-2 p-5 opacity-80">
                      <div className="col-span-2 rounded-lg signal-gradient" />
                      <div className="col-span-3 rounded-lg bg-volt-dim" />
                      <div className="col-span-5 rounded-lg bg-elevated" />
                      <div className="col-span-3 rounded-lg bg-elevated" />
                      <div className="col-span-2 rounded-lg bg-card" />
                    </div>
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="glass-panel grid h-12 w-12 place-items-center rounded-full">
                        <Play className="h-5 w-5 fill-volt text-volt" strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                  {/* Bottom: brain-rot runner */}
                  <div className="relative flex-1 overflow-hidden border-t-2 border-volt bg-base">
                    <div className="rp-runner absolute inset-0" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="mb-3 inline-block rounded bg-black/50 px-2 py-1 font-mono text-[11px] text-volt">
                        burned-in captions
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/20">
                        <div className="h-full w-[45%] bg-volt" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* status bar */}
                <div className="absolute left-6 right-6 top-8 flex justify-between">
                  <span className="rounded bg-black/40 px-2 font-mono text-[12px] text-white">9:41</span>
                  <div className="flex gap-1">
                    <div className="h-1 w-4 rounded-full bg-white" />
                    <div className="h-1 w-2 rounded-full bg-white/40" />
                  </div>
                </div>
              </div>
              {/* floating tile */}
              <div className="glass-panel rp-float absolute -right-6 -top-6 -z-0 grid h-28 w-28 place-items-center rounded-xl">
                <Sparkles className="h-9 w-9 text-volt" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Demo strip: 1-click transformation ─────────────────────────── */}
        <section className="overflow-hidden border-y border-border bg-surface py-16">
          <div className="mx-auto max-w-[1280px] px-6">
            <div className="mb-10 text-center">
              <h2 className="mb-2 font-syne text-[clamp(28px,4vw,40px)] font-semibold tracking-tight text-t1">
                The 1-Click Transformation
              </h2>
              <p className="text-t2">Drag the slider to see how RotPitch fixes your boring recordings.</p>
            </div>
            <BeforeAfterSlider />
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, chip, title, body }) => (
              <div
                key={title}
                className="glass-panel flex flex-col gap-4 rounded-xl p-6 transition-colors hover:bg-card"
              >
                <div
                  className={
                    'grid h-12 w-12 place-items-center rounded-md ' +
                    (chip === 'signal'
                      ? 'signal-gradient text-black'
                      : chip === 'nebula'
                        ? 'nebula-gradient text-white'
                        : 'bg-white text-black')
                  }
                >
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-syne text-[24px] font-semibold tracking-tight text-t1">{title}</h3>
                <p className="text-t2">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Testimonials ────────────────────────────────────────────────── */}
        <section className="bg-surface py-16">
          <div className="mx-auto max-w-[1280px] px-6">
            <div className="mb-10 text-center">
              <span className="font-mono text-[12px] uppercase tracking-widest text-volt">Growth</span>
              <h2 className="mt-2 font-syne text-[clamp(28px,4vw,40px)] font-semibold tracking-tight text-t1">
                Built by founders, for founders
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {TESTIMONIALS.map(({ name, role, quote, metric, icon: Icon }) => (
                <div key={name} className="nebula-border p-6">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-elevated" />
                    <div>
                      <h4 className="font-bold text-t1">{name}</h4>
                      <p className="font-mono text-[12px] text-t2">{role}</p>
                    </div>
                  </div>
                  <p className="mb-4 italic text-t1">&ldquo;{quote}&rdquo;</p>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="font-mono text-[12px] font-bold text-volt">{metric}</span>
                    <Icon className="h-5 w-5 text-t2" strokeWidth={1.5} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing (real PLANS data) ───────────────────────────────────── */}
        <section id="pricing" className="mx-auto max-w-[1280px] scroll-mt-24 px-6 py-16">
          <div className="mb-10 text-center">
            <h2 className="font-syne text-[clamp(28px,4vw,40px)] font-semibold tracking-tight text-t1">
              Simple, transparent pricing
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PLAN_IDS.map((id) => {
              const plan = PLANS[id];
              const isPopular = id === 'popular';
              return (
                <div
                  key={id}
                  className={
                    'relative flex flex-col p-6 ' +
                    (isPopular
                      ? 'nebula-border'
                      : 'glass-panel rounded-xl transition-colors hover:border-volt/40')
                  }
                >
                  {isPopular && (
                    <div className="signal-gradient absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-tight text-black shadow-lg">
                      Most Popular
                    </div>
                  )}
                  <span className="mb-2 font-mono text-[12px] uppercase tracking-wide text-t2">
                    {plan.name}
                  </span>
                  <div className="mb-4 flex items-baseline gap-1">
                    <span className="font-syne text-[40px] font-semibold leading-none text-t1">
                      {plan.priceUsd === 0 ? '$0' : `$${plan.priceUsd}`}
                    </span>
                    <span className="font-mono text-[12px] text-t2">/mo</span>
                  </div>
                  <ul className="mb-10 space-y-3 text-t2">
                    {PLAN_HIGHLIGHTS[id].map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-volt" strokeWidth={2} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={
                      'mt-auto w-full rounded-md py-3 text-center font-bold transition-all ' +
                      (isPopular
                        ? 'signal-gradient text-black hover:scale-105'
                        : 'border border-border-strong text-t1 hover:bg-white hover:text-black')
                    }
                  >
                    {PLAN_CTA[id]}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="mb-10 text-center font-syne text-[clamp(28px,4vw,40px)] font-semibold tracking-tight text-t1">
            Common Questions
          </h2>
          <FAQ />
        </section>

        {/* ── Final CTA ───────────────────────────────────────────────────── */}
        <section className="px-6 py-16">
          <div className="nebula-gradient mx-auto flex max-w-[1280px] flex-col items-center rounded-[3rem] p-12 text-center">
            <h2 className="mb-4 font-syne text-[clamp(32px,5vw,48px)] font-bold leading-tight text-black">
              Your product deserves to be seen
            </h2>
            <p className="mb-10 max-w-lg text-[18px] text-black/80">
              Join 2,000+ founders using RotPitch to dominate social media.
            </p>
            <Link
              href="/signup"
              className="rounded-md bg-black px-7 py-4 text-[18px] font-bold text-white transition-transform hover:scale-105"
            >
              Get started free
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-10 w-full border-t border-border bg-surface px-6 py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-6 md:flex-row">
          <Brand />
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Security', 'Contact'].map((label) => (
              <a
                key={label}
                href="#"
                className="font-mono text-[12px] text-t2 transition-colors hover:text-t1"
              >
                {label}
              </a>
            ))}
          </div>
          <p className="font-mono text-[12px] text-t3">© 2026 RotPitch. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

import {
  Captions,
  CircleAlert,
  CircleCheck,
  Cloud,
  Download,
  Loader2,
  RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Rendering · RotPitch' };

/**
 * Rendering Progress (Stitch). PRESENTATIONAL — demo data only. The render
 * pipeline (BullMQ jobs → FFmpeg → S3) lands in Phase 5; this screen will then
 * subscribe to live per-job status and a real batch queue.
 */
export default function RenderingPage() {
  return (
    <div className="mx-auto max-w-[1200px]">
      <header className="mb-6">
        <h1 className="font-syne text-[clamp(28px,4vw,40px)] font-bold tracking-tight text-t1">
          Rendering your videos…
        </h1>
        <p className="mt-2 text-[16px] text-t2">Engineered for high-velocity creation.</p>
      </header>

      <PhaseNote>
        Presentational preview — wired to live job status &amp; the real batch queue in Phase 5.
      </PhaseNote>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Single render */}
        <section className="lg:col-span-5">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg">
            <div className="relative mb-6 aspect-[9/16] w-full overflow-hidden rounded-xl bg-base">
              <span className="absolute inset-0 scale-110 bg-gradient-to-br from-violet/40 to-cyan/20 opacity-40 blur-lg" />
              <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-volt/30">
                  <Loader2 className="h-6 w-6 animate-spin text-volt" strokeWidth={1.5} />
                </div>
                <span className="mt-4 font-mono text-[12px] text-volt">PREVIEW_LAYER_04</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <span className="font-mono text-[28px] font-bold text-volt">68%</span>
                <span className="flex animate-pulse items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-t2">
                  <Captions className="h-3.5 w-3.5" strokeWidth={1.5} /> Burning captions…
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-elevated">
                <div className="signal-gradient relative h-full rounded-full" style={{ width: '68%' }}>
                  <span className="rp-shimmer absolute inset-0" />
                </div>
              </div>
              <div className="flex justify-between font-mono text-[11px] text-t3">
                <span>EST: 02:45 remaining</span>
                <span>1080p · 60fps</span>
              </div>
            </div>
          </div>
        </section>

        {/* Batch queue */}
        <section className="lg:col-span-7">
          <div className="h-full rounded-2xl border border-border bg-surface p-8">
            <div className="mb-8 flex items-center justify-between border-b border-border pb-6">
              <h2 className="font-syne text-[22px] font-semibold text-t1">Batch Queue</h2>
              <span className="rounded-full border border-border bg-elevated px-4 py-1.5 font-mono text-[12px] text-volt">
                2 of 4 complete
              </span>
            </div>

            <div className="space-y-4">
              <BatchRow index={1} title="Summer_Vlog_Final_01" state="done" meta="42.8 MB · MP4" />
              <BatchRow index={2} title="Product_Teaser_Vertical" state="processing" progress={33} />
              <BatchRow index={3} title="Promo_Clip_v2" state="failed" meta="Credit refunded" />
              <BatchRow index={4} title="Launch_Hook_Cut" state="processing" progress={8} />
            </div>

            <div className="mt-10 flex items-center justify-center gap-2 text-t3">
              <Cloud className="h-4 w-4" strokeWidth={1.5} />
              <p className="text-[14px] italic">You can leave this page — we&apos;ll keep rendering.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function BatchRow({
  index,
  title,
  state,
  meta,
  progress,
}: {
  index: number;
  title: string;
  state: 'done' | 'processing' | 'failed';
  meta?: string;
  progress?: number;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-5 rounded-xl border bg-card p-4 transition-colors',
        state === 'failed' ? 'border-error/20 bg-card/50' : 'border-border hover:border-border-strong',
      )}
    >
      <span
        className={cn(
          'font-mono text-[18px]',
          state === 'processing' ? 'text-volt' : 'text-t3 opacity-50',
        )}
      >
        {String(index).padStart(2, '0')}
      </span>

      <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-base">
        <span
          className={cn(
            'absolute inset-0 bg-gradient-to-br from-cyan/30 to-volt/20',
            state !== 'done' && 'opacity-50 grayscale',
          )}
        />
        {state === 'done' && (
          <span className="absolute inset-0 grid place-items-center bg-black/40">
            <CircleCheck className="h-5 w-5 text-volt" strokeWidth={1.5} />
          </span>
        )}
        {state === 'processing' && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-elevated">
            <span className="signal-gradient block h-full" style={{ width: `${progress ?? 0}%` }} />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className={cn('truncate font-semibold', state === 'failed' ? 'text-t2' : 'text-t1')}>
          {title}
        </h3>
        {state === 'processing' ? (
          <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-elevated">
            <div className="signal-gradient h-full" style={{ width: `${progress ?? 0}%` }} />
          </div>
        ) : (
          <p className={cn('font-mono text-[11px]', state === 'failed' ? 'text-error' : 'text-t3')}>
            {meta}
          </p>
        )}
      </div>

      {state === 'done' && (
        <button
          type="button"
          className="flex items-center gap-2 rounded-md bg-volt px-4 py-2 font-mono text-[12px] font-bold text-base transition-transform hover:scale-105"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Download
        </button>
      )}
      {state === 'processing' && (
        <span className="flex items-center gap-2 font-mono text-[11px] text-volt">
          <span className="h-2 w-2 animate-pulse rounded-full bg-volt" /> Processing
        </span>
      )}
      {state === 'failed' && (
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1 font-mono text-[12px] font-bold text-error">
            <CircleAlert className="h-3.5 w-3.5" strokeWidth={1.5} /> Failed
          </span>
          <button
            type="button"
            className="flex items-center gap-1 font-mono text-[10px] text-t2 underline transition-colors hover:text-t1"
          >
            <RotateCw className="h-3 w-3" strokeWidth={1.5} /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

function PhaseNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 font-mono text-[12px] text-info">
      {children}
    </div>
  );
}

import {
  Captions,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Download,
  Layers,
  Link2,
  Maximize,
  Monitor,
  Play,
  RotateCw,
  Smartphone,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Preview · RotPitch' };

const VARIATION_TONES = [
  'from-violet/40 to-cyan/20',
  'from-cyan/30 to-volt/20',
  'from-cyan/20 to-volt/10',
  'from-volt/30 to-cyan/20',
  'from-cyan/20 to-violet/30',
] as const;

/**
 * Video Preview (Stitch). PRESENTATIONAL — demo data only. Player controls and
 * the action buttons (download / regenerate / batch / copy link) wire to real
 * rendered output once the render pipeline + storage land in Phase 5. This will
 * become the per-video route (e.g. /app/videos/[id]).
 */
export default function PreviewPage() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col items-center">
      {/* Success banner (Stitch render-complete toast, inlined) */}
      <div className="glass-panel mb-8 flex items-center gap-3 self-end rounded-xl px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-volt-dim">
          <CircleCheck className="h-4 w-4 text-volt" strokeWidth={1.5} />
        </span>
        <div className="flex flex-col">
          <span className="font-mono text-[12px] text-t1">Render complete</span>
          <span className="font-mono text-[10px] text-t3">1 credit used</span>
        </div>
      </div>

      {/* Title + metadata */}
      <div className="mb-4 w-full text-center">
        <h1 className="mb-2 font-syne text-[32px] font-semibold tracking-tight text-t1">
          Product Demo — Subway Edition
        </h1>
        <div className="flex items-center justify-center gap-3 font-mono text-[12px] uppercase tracking-wider text-t2">
          <span>9:16</span>
          <Dot />
          <span>0:48</span>
          <Dot />
          <span>MP4</span>
          <Dot />
          <span className="text-volt">Subway Gameplay</span>
        </div>
      </div>

      <div className="mb-8 w-full">
        <div className="mx-auto inline-flex w-full justify-center">
          <span className="rounded-md border border-info/30 bg-info/10 px-4 py-2.5 font-mono text-[12px] text-info">
            Presentational preview — real playback &amp; downloads wire up in Phase 5.
          </span>
        </div>
      </div>

      {/* Player + actions */}
      <div className="flex w-full max-w-6xl flex-col items-center justify-center gap-12 md:flex-row md:items-start">
        {/* Format toggle */}
        <div className="glass-panel hidden flex-col gap-3 rounded-2xl p-2 lg:flex">
          <FormatToggle icon={Smartphone} label="9:16" active />
          <FormatToggle icon={Monitor} label="16:9" pro />
        </div>

        {/* Main player */}
        <div className="group relative aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-2xl border border-border bg-base shadow-lg">
          <span className="absolute inset-0 bg-gradient-to-br from-violet/40 to-cyan/20 opacity-80" />
          {/* Idle central play */}
          <div className="absolute inset-0 grid place-items-center transition-opacity group-hover:opacity-0">
            <span className="glass-panel grid h-20 w-20 place-items-center rounded-full border-white/20">
              <Play className="h-8 w-8 fill-white text-white" strokeWidth={1.5} />
            </span>
          </div>
          {/* Hover controls */}
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="mb-4 flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-base">
                <Play className="h-5 w-5 fill-base" strokeWidth={1.5} />
              </span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <span className="absolute left-0 top-0 h-full w-1/3 bg-volt" />
              </div>
              <span className="font-mono text-[11px] text-white">0:14 / 0:48</span>
            </div>
            <div className="flex items-center justify-between text-white">
              <div className="flex gap-4">
                <Volume2 className="h-5 w-5 cursor-pointer transition-colors hover:text-volt" strokeWidth={1.5} />
                <Captions className="h-5 w-5 cursor-pointer transition-colors hover:text-volt" strokeWidth={1.5} />
              </div>
              <Maximize className="h-5 w-5 cursor-pointer transition-colors hover:text-volt" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Action sidebar */}
        <div className="flex w-full flex-col gap-3 md:w-64">
          <button
            type="button"
            className="signal-gradient flex items-center justify-center gap-3 rounded-md px-6 py-4 font-bold text-base shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="h-5 w-5" strokeWidth={1.5} /> Download
          </button>
          <div className="my-2 h-px w-full bg-border" />
          <ActionButton icon={RotateCw}>Regenerate variation</ActionButton>
          <ActionButton icon={Layers}>Make a batch</ActionButton>
          <ActionButton icon={Link2}>Copy link</ActionButton>
        </div>
      </div>

      {/* Batch siblings */}
      <div className="mt-16 w-full max-w-6xl border-t border-border pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-syne text-[18px] font-semibold text-t1">Other variations in this batch</h2>
          <div className="flex gap-2">
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-border transition-colors hover:bg-elevated">
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-border transition-colors hover:bg-elevated">
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {VARIATION_TONES.map((tone, i) => (
            <div key={tone} className="group flex cursor-pointer flex-col gap-2">
              <div
                className={cn(
                  'relative aspect-[9/16] overflow-hidden rounded-xl border',
                  i === 0 ? 'border-volt/50 ring-2 ring-volt/30' : 'border-border',
                )}
              >
                <span className={cn('absolute inset-0 bg-gradient-to-br transition-transform group-hover:scale-105', tone)} />
                <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Download className="h-5 w-5 text-white" strokeWidth={1.5} />
                </span>
              </div>
              <span className="text-center font-mono text-[10px] text-t2">
                Variant #{String(i + 1).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-border-strong" />;
}

function FormatToggle({
  icon: Icon,
  label,
  active,
  pro,
}: {
  icon: typeof Smartphone;
  label: string;
  active?: boolean;
  pro?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        'relative flex flex-col items-center gap-1 rounded-xl p-3 transition-colors',
        active
          ? 'border border-volt/40 bg-elevated text-volt'
          : 'text-t2 hover:bg-elevated',
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} />
      <span className="font-mono text-[10px]">{label}</span>
      {pro && (
        <span className="nebula-gradient absolute -right-12 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 font-mono text-[8px] font-bold text-white shadow-lg">
          PRO
        </span>
      )}
    </button>
  );
}

function ActionButton({ icon: Icon, children }: { icon: typeof RotateCw; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-md border border-border px-6 py-3 text-[15px] text-t1 transition-colors hover:border-border-strong hover:bg-elevated"
    >
      <Icon className="h-5 w-5 text-t2" strokeWidth={1.5} />
      {children}
    </button>
  );
}

'use client';

import { useCallback, useRef, useState } from 'react';
import { MoveHorizontal, Play } from 'lucide-react';

/**
 * Demo strip "1-click transformation" comparison from the Stitch landing.
 * A dull grayscale "before" recording sits underneath; the vibrant RotPitch
 * split-screen "after" is clipped to the slider position. Drag anywhere.
 */
export function BeforeAfterSlider() {
  const [pct, setPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPct(Math.min(100, Math.max(0, next)));
  }, []);

  return (
    <div
      ref={containerRef}
      className="group relative mx-auto aspect-video max-w-4xl cursor-ew-resize overflow-hidden rounded-xl border border-border"
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse' && !dragging.current) setFromClientX(e.clientX);
        else if (dragging.current) setFromClientX(e.clientX);
      }}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }}
    >
      {/* BEFORE — plain, dull recording */}
      <div className="absolute inset-0 bg-surface">
        <div className="grid h-full w-full grid-cols-6 grid-rows-4 gap-px opacity-40 grayscale">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="bg-elevated" />
          ))}
        </div>
        <div className="glass-panel absolute left-4 top-4 rounded px-2 py-1 font-mono text-[12px] lowercase tracking-wide text-t3">
          input.mp4 — 0_views_energy
        </div>
      </div>

      {/* AFTER — RotPitch split-screen, clipped to slider */}
      <div
        className="absolute inset-0 z-10 overflow-hidden border-r-2 border-volt"
        style={{ width: `${pct}%` }}
      >
        {/* fixed-width inner so content doesn't squash as the clip narrows */}
        <div className="absolute inset-y-0 left-0 flex w-[896px] max-w-none flex-col">
          <div className="relative flex-1 bg-gradient-to-br from-elevated to-card">
            <div className="absolute inset-0 grid grid-cols-5 gap-3 p-6 opacity-80">
              <div className="col-span-2 rounded-lg signal-gradient" />
              <div className="col-span-3 rounded-lg bg-volt-dim" />
              <div className="col-span-3 rounded-lg bg-elevated" />
              <div className="col-span-2 rounded-lg bg-elevated" />
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <div className="glass-panel grid h-12 w-12 place-items-center rounded-full">
                <Play className="h-5 w-5 fill-volt text-volt" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <div className="relative flex-1 overflow-hidden border-t-2 border-volt bg-base">
            <div className="rp-runner absolute inset-0" />
            <div className="absolute bottom-3 left-4 right-4">
              <div className="h-1 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[62%] bg-volt" />
              </div>
            </div>
          </div>
        </div>
        <div className="glass-panel absolute left-4 top-4 z-10 whitespace-nowrap rounded px-2 py-1 font-mono text-[12px] lowercase tracking-wide text-volt">
          output.mp4 — feed_ready
        </div>
      </div>

      {/* Handle */}
      <div
        className="absolute bottom-0 top-0 z-20 flex w-1 -translate-x-1/2 items-center justify-center bg-volt"
        style={{ left: `${pct}%` }}
      >
        <div className="grid h-10 w-10 place-items-center rounded-full bg-volt text-base shadow-lg">
          <MoveHorizontal className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

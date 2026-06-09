'use client';

import Link from 'next/link';
import { X, Zap } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

/**
 * Insufficient-credits blocker (brand "credit-meter" treatment). Surfaced when a
 * generate/batch request costs more credits than the user holds. Leads with a
 * visual have-vs-need meter on the volt/Signal accent — calmer and on-brand than
 * a system alert — and routes to billing to top up or upgrade.
 */
export function OutOfCreditsModal({
  open,
  onClose,
  needed,
  available,
}: {
  open: boolean;
  onClose: () => void;
  /** Credits this action requires. */
  needed: number;
  /** Credits the user currently holds. */
  available: number;
}) {
  const fillPct = needed > 0 ? Math.min(100, Math.round((available / needed) * 100)) : 0;
  const isBatch = needed > 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="out-of-credits-title"
      className="max-w-[440px] rounded-[24px] !bg-card backdrop-blur-none"
    >
      {/* Ambient volt glow behind the meter */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 bg-volt/10 blur-[64px]" />

      {/* Dismiss */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-t2 transition-colors hover:bg-elevated hover:text-t1"
      >
        <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>

      <div className="relative flex flex-col items-center px-8 pb-8 pt-10 text-center">
        {/* Credit meter — have vs need */}
        <div className="mb-7 w-full rounded-[16px] border border-border bg-base/60 p-5">
          <div className="flex items-end justify-between">
            <div className="flex flex-col items-start">
              <span
                className={cn(
                  'font-mono text-[34px] font-semibold leading-none',
                  available === 0 ? 'text-error' : 'text-t1',
                )}
              >
                {available}
              </span>
              <span className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-t3">
                have
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono text-[34px] font-semibold leading-none text-volt">
                {needed}
              </span>
              <span className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-t3">
                need
              </span>
            </div>
          </div>
          {/* Track */}
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-elevated">
            <div
              className="signal-gradient h-full rounded-full transition-[width] duration-500"
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        <h2
          id="out-of-credits-title"
          className="mb-2 font-syne text-[22px] font-semibold tracking-tight text-t1"
        >
          Not enough credits
        </h2>
        <p className="mb-7 text-[14px] leading-relaxed text-t2">
          Top up to render this {isBatch ? 'batch' : 'clip'}. You need{' '}
          <span className="font-semibold text-t1">
            {needed} credit{needed === 1 ? '' : 's'}
          </span>{' '}
          and have <span className="font-semibold text-error">{available}</span>.
        </p>

        <div className="flex w-full flex-col gap-2.5">
          <Link
            href="/app/billing"
            className="signal-gradient flex w-full items-center justify-center gap-2 rounded-md px-6 py-3.5 font-bold text-base transition-transform hover:brightness-105 active:scale-[0.98]"
          >
            <Zap className="h-[18px] w-[18px]" strokeWidth={2} />
            Get credits
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md px-6 py-3 text-[14px] text-t2 transition-colors hover:text-t1"
          >
            Maybe later
          </button>
        </div>
      </div>
    </Modal>
  );
}

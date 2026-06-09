'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { PLANS, type PlanId } from '@rotpitch/shared';
import { Modal } from '@/components/ui/Modal';

/** Headline benefits for a plan, most compelling first (max 4 shown). */
function planHighlights(planId: PlanId): string[] {
  const { features, monthlyCredits } = PLANS[planId];
  const out: string[] = [];
  if (features.aiVoiceover) out.push('AI voiceover (coming soon)');
  if (features.formats.includes('horizontal')) out.push('16:9 horizontal export');
  if (features.autoCaptions) out.push('Auto captions (Whisper)');
  if (features.autoGenerate) out.push('Auto Generate — 2–5 clips at once');
  if (features.priorityQueue) out.push('Priority render queue');
  if (features.backgroundStyles === 'all') out.push('All background styles');
  out.push(`${monthlyCredits} credits / month`);
  if (!features.watermark) out.push('No watermark');
  return out.slice(0, 4);
}

/**
 * Premium upsell modal (Stitch "Upgrade Modal"). Plan-driven from PLANS — pass
 * the target plan a locked feature requires; copy, benefits and price follow.
 * The CTA routes to billing (checkout lands in Phase 7).
 */
export function UpgradeModal({
  open,
  onClose,
  targetPlan = 'popular',
}: {
  open: boolean;
  onClose: () => void;
  targetPlan?: PlanId;
}) {
  const plan = PLANS[targetPlan];
  const highlights = planHighlights(targetPlan);

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="upgrade-title"
      className="nebula-border max-w-md"
    >
      {/* Decorative nebula orbs */}
      <div className="nebula-gradient pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full opacity-10 blur-3xl" />
      <div className="nebula-gradient pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full opacity-10 blur-3xl" />

      <div className="relative flex flex-col items-center p-8 text-center">
        {targetPlan === 'popular' && (
          <span className="nebula-gradient mb-4 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
            Most Popular
          </span>
        )}

        <h2
          id="upgrade-title"
          className="mb-3 font-syne text-[28px] font-semibold leading-tight tracking-tight text-t1"
        >
          Unlock this with {plan.name}
        </h2>
        <p className="mb-7 max-w-[280px] text-[15px] text-t2">
          Supercharge your workflow with advanced creator tools.
        </p>

        <ul className="mb-7 w-full space-y-4 text-left">
          {highlights.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-volt-dim">
                <Check className="h-3.5 w-3.5 text-volt" strokeWidth={2.5} />
              </span>
              <span className="text-[15px] text-t1">{benefit}</span>
            </li>
          ))}
        </ul>

        <div className="mb-7 flex items-baseline gap-1">
          <span className="font-mono text-[32px] font-bold text-t1">
            ${plan.priceUsd.toFixed(2)}
          </span>
          <span className="font-mono text-t2">/mo</span>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link
            href="/app/billing"
            className="nebula-gradient w-full rounded-md py-4 text-center font-bold text-white transition-transform hover:brightness-105 active:scale-[0.98]"
          >
            Upgrade to {plan.name}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md py-3 font-medium text-t2 transition-colors hover:text-t1"
          >
            Maybe later
          </button>
        </div>
      </div>
    </Modal>
  );
}

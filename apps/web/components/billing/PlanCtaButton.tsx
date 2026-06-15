'use client';

import { useState } from 'react';
import { PLAN_IDS, type PlanId } from '@rotpitch/shared';
import { startCheckout, openBillingPortal } from '@/lib/api';
import { cn } from '@/lib/cn';

/**
 * Plan card CTA. A free user buys via the Dodo hosted Checkout Session; an
 * already-subscribed user routes every change (upgrade / downgrade / cancel)
 * through the Dodo Customer Portal so we never create a second subscription.
 */
export function PlanCtaButton({
  userPlan,
  targetPlan,
  isPopular,
}: {
  userPlan: PlanId;
  targetPlan: PlanId;
  isPopular: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (targetPlan === userPlan) {
    return (
      <button
        type="button"
        disabled
        className="cursor-default rounded-md border border-border py-2.5 text-center font-mono text-[12px] font-bold uppercase tracking-wide text-t2"
      >
        Current plan
      </button>
    );
  }

  const onFree = userPlan === 'free';
  const targetIsFree = targetPlan === 'free';
  const isUpgrade = PLAN_IDS.indexOf(targetPlan) > PLAN_IDS.indexOf(userPlan);

  async function handle() {
    setError(null);
    setLoading(true);
    try {
      const { url } =
        onFree && !targetIsFree
          ? await startCheckout(targetPlan as 'basic' | 'popular' | 'pro')
          : await openBillingPortal();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const label = onFree ? 'Upgrade' : targetIsFree ? 'Cancel plan' : isUpgrade ? 'Upgrade' : 'Switch';

  return (
    <div>
      <button
        type="button"
        onClick={handle}
        disabled={loading}
        className={cn(
          'w-full rounded-md py-2.5 text-center font-mono text-[12px] font-bold uppercase tracking-wide transition disabled:opacity-60',
          targetIsFree
            ? 'border border-border text-t2 hover:border-border-strong'
            : isPopular
              ? 'nebula-gradient text-white'
              : isUpgrade
                ? 'signal-gradient text-base'
                : 'border border-border text-t2 hover:border-border-strong',
        )}
      >
        {loading ? 'Opening…' : label}
      </button>
      {error && <p className="mt-2 text-center font-mono text-[11px] text-error">{error}</p>}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import {
  CREDIT_PACKS,
  CREDIT_PACK_IDS,
  packUnitPrice,
  planAllowsTopUp,
  type CreditPackId,
  type PlanId,
} from '@rotpitch/shared';
import { startTopUp } from '@/lib/api';
import { cn } from '@/lib/cn';
import { capture } from '@/lib/analytics';

/**
 * One-time credit packs, for a subscriber who runs out mid-cycle. Plan credits
 * are the primary product, so the packs deliberately cost more per credit than
 * a subscription — the cheapest per-credit pack is still worse value than
 * upgrading, which is the nudge we want.
 *
 * Free users can't buy: their answer to "no credits" is to subscribe, and a
 * plan activation replaces the balance, so credits bought on Free would be
 * wiped on their first purchase. They get an upgrade prompt instead.
 */
export function CreditPackCards({ plan }: { plan: PlanId }) {
  const [loading, setLoading] = useState<CreditPackId | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!planAllowsTopUp(plan)) {
    return (
      <div className="rounded-[16px] border border-dashed border-border bg-card/40 px-6 py-8 text-center">
        <p className="text-[14px] text-t2">
          Credit packs are available on paid plans. Subscribe to unlock top-ups — and get monthly
          credits, longer clips, and no watermark.
        </p>
        <Link
          href="/app/billing"
          className="signal-gradient mt-5 inline-flex items-center gap-2 rounded-md px-6 py-3 text-[14px] font-bold text-base transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Zap className="h-4 w-4" strokeWidth={2} /> See plans
        </Link>
      </div>
    );
  }

  async function buy(pack: CreditPackId) {
    setError(null);
    setLoading(pack);
    try {
      const { url } = await startTopUp(pack);
      capture('checkout_started', { kind: 'credit_pack', pack, plan });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout');
      setLoading(null);
    }
  }

  // Cheapest per credit gets the highlight.
  const bestValue = CREDIT_PACK_IDS.reduce((best, id) =>
    packUnitPrice(CREDIT_PACKS[id]) < packUnitPrice(CREDIT_PACKS[best]) ? id : best,
  );

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {CREDIT_PACK_IDS.map((id) => {
          const pack = CREDIT_PACKS[id];
          const isBest = id === bestValue;
          return (
            <div
              key={id}
              className={cn(
                'relative flex flex-col rounded-[16px] border bg-card p-5',
                isBest ? 'border-volt' : 'border-border',
              )}
            >
              {isBest && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-volt px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-base">
                  Best value
                </span>
              )}
              <span className="font-mono text-[34px] font-bold leading-none text-t1">
                {pack.credits}
              </span>
              <span className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-t3">
                credits
              </span>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-syne text-[20px] font-bold text-t1">
                  ${pack.priceUsd.toFixed(2)}
                </span>
                <span className="font-mono text-[11px] text-t3">
                  ${packUnitPrice(pack).toFixed(2)}/credit
                </span>
              </div>
              <button
                type="button"
                onClick={() => buy(id)}
                disabled={loading !== null}
                className={cn(
                  'mt-5 w-full rounded-md py-2.5 text-center font-mono text-[12px] font-bold uppercase tracking-wide transition disabled:opacity-60',
                  isBest
                    ? 'signal-gradient text-base'
                    : 'border border-border text-t2 hover:border-border-strong',
                )}
              >
                {loading === id ? 'Opening…' : 'Buy'}
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-center font-mono text-[11px] text-error">{error}</p>}

      <p className="mt-4 text-center font-mono text-[11px] leading-relaxed text-t3">
        Top-up credits are added to your balance immediately and ride your current billing cycle —
        like plan credits, they don&apos;t roll over past your next renewal.
      </p>
    </div>
  );
}

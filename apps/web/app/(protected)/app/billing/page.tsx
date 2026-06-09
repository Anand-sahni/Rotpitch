import { Check, Minus } from 'lucide-react';
import { PLANS, PLAN_IDS, type PlanId } from '@rotpitch/shared';
import { getProfile } from '@/lib/data';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Billing · RotPitch' };
export const dynamic = 'force-dynamic';

const ORDER: PlanId[] = ['free', 'basic', 'popular', 'pro'];

function rank(p: PlanId) {
  return PLAN_IDS.indexOf(p);
}

function featureRows(id: PlanId): { label: string; ok: boolean | string; soon?: boolean }[] {
  const f = PLANS[id].features;
  return [
    { label: 'Monthly credits', ok: String(PLANS[id].monthlyCredits) },
    {
      label: 'Background styles',
      ok: f.backgroundStyles === 'all' ? 'All' : `${f.backgroundStyles} only`,
    },
    { label: 'Auto captions', ok: f.autoCaptions },
    { label: 'AI voiceover', ok: f.aiVoiceover, soon: true },
    { label: 'Horizontal 16:9', ok: f.formats.includes('horizontal') },
    { label: 'Auto Generate (2–5)', ok: f.autoGenerate },
    { label: 'Priority render queue', ok: f.priorityQueue },
    { label: 'No watermark', ok: !f.watermark },
  ];
}

export default async function BillingPage() {
  const profile = await getProfile();
  if (!profile) return null;
  const current = profile.plan;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-2 font-syne text-2xl font-bold tracking-tight text-t1">Billing &amp; Plans</h1>
      <p className="mb-8 text-[15px] text-t2">
        You&rsquo;re on the <span className="font-semibold text-t1">{PLANS[current].name}</span> plan.
      </p>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = id === current;
          const isPopular = id === 'popular';
          const isUpgrade = rank(id) > rank(current);
          const isDowngrade = rank(id) < rank(current);

          return (
            <div
              key={id}
              className={cn(
                'relative flex flex-col rounded-[20px] border bg-card p-6',
                isCurrent ? 'border-volt' : isPopular ? 'nebula-border' : 'border-border',
              )}
            >
              {isPopular && !isCurrent && (
                <span className="nebula-gradient absolute -top-3 left-6 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-white">
                  Most Popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-6 rounded-full bg-volt px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-base">
                  Current
                </span>
              )}

              <h2 className="font-syne text-[20px] font-bold text-t1">{plan.name}</h2>
              <div className="mb-5 mt-2 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-bold text-t1">
                  ${plan.priceUsd % 1 === 0 ? plan.priceUsd : plan.priceUsd.toFixed(2)}
                </span>
                <span className="font-mono text-[12px] text-t3">/mo</span>
              </div>

              <ul className="mb-6 flex-1 space-y-2.5">
                {featureRows(id).map((row) => (
                  <li key={row.label} className="flex items-start gap-2 text-[13px]">
                    {typeof row.ok === 'string' ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-volt" strokeWidth={2} />
                    ) : row.ok ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2} />
                    ) : (
                      <Minus className="mt-0.5 h-4 w-4 shrink-0 text-t3" strokeWidth={2} />
                    )}
                    <span className={row.ok === false ? 'text-t3' : 'text-t2'}>
                      {row.label}
                      {typeof row.ok === 'string' && (
                        <span className="ml-1 font-mono text-t1">· {row.ok}</span>
                      )}
                      {row.soon && (
                        <span className="ml-1.5 rounded-full border border-violet/40 bg-violet/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-violet">
                          Soon
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <PlanCta
                isCurrent={isCurrent}
                isUpgrade={isUpgrade}
                isDowngrade={isDowngrade}
                isFree={id === 'free'}
                isPopular={isPopular}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center font-mono text-[12px] text-t3">
        Payments via Stripe (international) &amp; Razorpay (India) — checkout wiring lands in Phase 7.
      </p>
    </div>
  );
}

function PlanCta({
  isCurrent,
  isUpgrade,
  isDowngrade,
  isFree,
  isPopular,
}: {
  isCurrent: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isFree: boolean;
  isPopular: boolean;
}) {
  if (isCurrent) {
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
  if (isDowngrade) {
    return (
      <button
        type="button"
        disabled
        title="Checkout wiring lands in Phase 7"
        className="cursor-not-allowed rounded-md border border-border py-2.5 text-center font-mono text-[12px] font-bold uppercase tracking-wide text-t3 opacity-60"
      >
        {isFree ? 'Downgrade' : 'Switch'}
      </button>
    );
  }
  // Upgrade
  return (
    <button
      type="button"
      disabled
      title="Checkout wiring lands in Phase 7"
      className={cn(
        'rounded-md py-2.5 text-center font-mono text-[12px] font-bold uppercase tracking-wide opacity-90',
        isPopular ? 'nebula-gradient text-white' : 'signal-gradient text-base',
      )}
    >
      Upgrade{isUpgrade ? '' : ''}
    </button>
  );
}

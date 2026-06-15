import { Check, Minus, CheckCircle2 } from 'lucide-react';
import { PLANS, type PlanId } from '@rotpitch/shared';
import { getProfile } from '@/lib/data';
import { cn } from '@/lib/cn';
import { PlanCtaButton } from '@/components/billing/PlanCtaButton';
import { ManageBillingButton } from '@/components/billing/ManageBillingButton';

export const metadata = { title: 'Billing · RotPitch' };
export const dynamic = 'force-dynamic';

const ORDER: PlanId[] = ['free', 'basic', 'popular', 'pro'];

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

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const profile = await getProfile();
  if (!profile) return null;
  const current = profile.plan;
  const isPaid = current !== 'free';

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="mb-2 font-syne text-2xl font-bold tracking-tight text-t1">
            Billing &amp; Plans
          </h1>
          <p className="text-[15px] text-t2">
            You&rsquo;re on the <span className="font-semibold text-t1">{PLANS[current].name}</span>{' '}
            plan.
          </p>
        </div>
        {isPaid && <ManageBillingButton />}
      </div>

      {searchParams.status === 'success' && (
        <div className="mb-8 flex items-start gap-3 rounded-[14px] border border-success/40 bg-success/10 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" strokeWidth={2} />
          <p className="text-[14px] text-t1">
            Payment received — thanks! Your plan and credits update within a few seconds. Refresh if
            you don&rsquo;t see them yet.
          </p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = id === current;
          const isPopular = id === 'popular';

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

              <PlanCtaButton userPlan={current} targetPlan={id} isPopular={isPopular} />
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center font-mono text-[12px] text-t3">
        Secure payments via Dodo Payments — global cards &amp; local methods, tax handled.
      </p>
    </div>
  );
}

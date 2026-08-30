import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Coins, Sparkles } from 'lucide-react';
import { PLANS } from '@rotpitch/shared';
import { getProfile, getCreditTransactions, type CreditTxRow } from '@/lib/data';
import { relativeTime } from '@/lib/format';
import { CreditPackCards } from '@/components/billing/CreditPackCards';

export const metadata = { title: 'Credits · RotPitch' };
export const dynamic = 'force-dynamic';

const TX_LABEL: Record<CreditTxRow['type'], string> = {
  signup: 'Signup bonus',
  purchase: 'Credits purchased',
  use: 'Video render',
  refund: 'Render refund',
  reset: 'Plan change',
};

export default async function CreditsPage() {
  const [profile, ledger] = await Promise.all([getProfile(), getCreditTransactions()]);
  if (!profile) return null;

  const plan = PLANS[profile.plan];
  const expires = profile.creditsExpiresAt;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 font-syne text-2xl font-bold tracking-tight text-t1">Credits</h1>

      {/* Balance card */}
      <div className="mb-8 overflow-hidden rounded-[20px] border border-border bg-card">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-mono text-[12px] uppercase tracking-wider text-t2">
              Available balance
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-5xl font-bold text-volt">
                {profile.creditsBalance}
              </span>
              <span className="font-mono text-[14px] text-t2">
                / {plan.monthlyCredits} on {plan.name}
              </span>
            </div>
            <p className="mt-2 font-mono text-[12px] text-t3">
              {plan.creditsExpire
                ? expires
                  ? `Renews ${relativeTime(expires)}`
                  : 'Renews monthly · no rollover'
                : 'Free credit never expires'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3">
            <Link
              href="/app/billing"
              className="flex items-center justify-center gap-2 rounded-md border border-border px-6 py-3 text-[14px] font-bold text-t1 transition-colors hover:border-border-strong"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.5} /> Change plan
            </Link>
            <p className="text-center font-mono text-[11px] text-t3">1 credit = 1 rendered video</p>
          </div>
        </div>
      </div>

      {/* Top-ups — the answer to "I burned my cycle's credits in week one" */}
      <div className="mb-10">
        <h2 className="mb-1.5 font-syne text-[18px] font-semibold text-t1">Need more credits?</h2>
        <p className="mb-5 text-[14px] text-t2">Buy a one-time pack without changing your plan.</p>
        <CreditPackCards plan={profile.plan} />
      </div>

      {/* Ledger */}
      <h2 className="mb-4 font-syne text-[18px] font-semibold text-t1">Transaction history</h2>
      {ledger.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-border py-16 text-center">
          <Coins className="h-8 w-8 text-t3" strokeWidth={1.5} />
          <p className="text-[14px] text-t2">No credit activity yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[16px] border border-border bg-card">
          {ledger.map((tx) => {
            const positive = tx.amount > 0;
            return (
              <li key={tx.id} className="flex items-center gap-4 px-5 py-4">
                <span
                  className={
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full ' +
                    (positive ? 'bg-success/10 text-success' : 'bg-elevated text-t2')
                  }
                >
                  {positive ? (
                    <ArrowDownLeft className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </span>
                <div className="flex-1">
                  <p className="text-[14px] text-t1">{TX_LABEL[tx.type]}</p>
                  <p className="font-mono text-[11px] text-t3">{relativeTime(tx.createdAt)}</p>
                </div>
                <span
                  className={
                    'font-mono text-[14px] font-bold ' + (positive ? 'text-success' : 'text-t2')
                  }
                >
                  {positive ? '+' : ''}
                  {tx.amount}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

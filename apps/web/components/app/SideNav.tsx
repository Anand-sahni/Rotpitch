'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Clapperboard,
  CirclePlus,
  Coins,
  CreditCard,
  Settings,
  CircleHelp,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { PLANS, type PlanId } from '@rotpitch/shared';
import { createClient } from '@/lib/supabase/client';
import { Brand } from '@/components/Brand';
import { cn } from '@/lib/cn';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Library is live; the other destinations are future Stitch screens — linked to
// their intended paths so the IA is in place as they're ported.
const NAV: NavItem[] = [
  { label: 'Library', href: '/app', icon: Clapperboard },
  { label: 'Create New', href: '/app/create', icon: CirclePlus },
  { label: 'Credits', href: '/app/credits', icon: Coins },
  { label: 'Billing', href: '/app/billing', icon: CreditCard },
  { label: 'Settings', href: '/app/settings', icon: Settings },
];

export function SideNav({ plan, credits }: { plan: PlanId; credits: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const planCredits = PLANS[plan].monthlyCredits;
  const pct = Math.min(100, Math.round((credits / Math.max(planCredits, 1)) * 100));

  async function onSignOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 z-[60] flex h-full w-60 flex-col border-r border-border bg-surface py-6">
      <div className="mb-10 px-6">
        <Link href="/app" aria-label="RotPitch">
          <Brand />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-4 py-3 text-[15px] transition-colors active:scale-[0.98]',
                active
                  ? 'border-l-2 border-volt bg-elevated text-volt'
                  : 'text-t2 hover:bg-elevated hover:text-t1',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Credit widget */}
      <div className="mt-auto px-4">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[12px] uppercase tracking-wider text-t2">Credits</span>
            <span className="font-mono text-[12px] text-volt">
              {credits} / {planCredits}
            </span>
          </div>
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
            <div className="signal-gradient h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <p className="mb-3 font-mono text-[11px] italic text-t3">
            {PLANS[plan].creditsExpire ? 'Renews monthly' : 'Never expires'}
          </p>
          <Link
            href="/#pricing"
            className="nebula-gradient block w-full rounded-full py-2 text-center font-mono text-[12px] font-bold text-white transition-opacity hover:opacity-90"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-6 border-t border-border px-2 pt-4">
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-3 text-[13px] text-t2 transition-colors hover:text-t1"
        >
          <CircleHelp className="h-5 w-5" strokeWidth={1.5} />
          <span>Help</span>
        </a>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 px-4 py-3 text-[13px] text-t2 transition-colors hover:text-t1"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.5} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

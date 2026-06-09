import Link from 'next/link';
import { Bell, Search, Zap } from 'lucide-react';

/**
 * Fixed top bar for the protected app shell (Stitch dashboard). Sits to the
 * right of the 60-unit sidebar. Search is presentational for now.
 */
export function AppHeader({ email }: { email: string }) {
  const initial = email.trim().charAt(0).toUpperCase() || 'U';

  return (
    <header className="fixed right-0 top-0 z-50 flex h-16 w-[calc(100%-15rem)] items-center justify-between border-b border-border bg-[var(--glass)] px-8 backdrop-blur-glass">
      <div className="relative w-64">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-t3"
          size={18}
          strokeWidth={1.5}
        />
        <input
          type="text"
          placeholder="Search projects…"
          className="w-full rounded-full border border-border bg-card py-2 pl-10 pr-4 text-[15px] text-t1 outline-none transition-colors placeholder:text-t3 focus:border-volt"
        />
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/app/create"
          className="signal-gradient flex items-center gap-2 rounded-md px-5 py-2 font-mono text-[12px] font-bold uppercase tracking-wide text-base transition-transform hover:scale-105 active:scale-95"
        >
          New Video <Zap className="h-4 w-4 fill-base" strokeWidth={1.5} />
        </Link>
        <button
          type="button"
          aria-label="Notifications"
          className="text-t2 transition-colors hover:text-t1"
        >
          <Bell className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div
          className="grid h-8 w-8 place-items-center rounded-full border border-border bg-elevated font-mono text-[13px] font-bold text-t1"
          title={email}
        >
          {initial}
        </div>
      </div>
    </header>
  );
}

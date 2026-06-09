import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { PLANS } from '@rotpitch/shared';
import { getProfile } from '@/lib/data';
import { ThemeSwitcher } from '@/components/app/ThemeSwitcher';
import { SignOutButton } from '@/components/auth/SignOutButton';

export const metadata = { title: 'Settings · RotPitch' };
export const dynamic = 'force-dynamic';

function memberSince(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="font-syne text-2xl font-bold tracking-tight text-t1">Settings</h1>

      {/* Account */}
      <section className="rounded-[20px] border border-border bg-card p-6">
        <h2 className="mb-5 font-syne text-[18px] font-semibold text-t1">Account</h2>
        <dl className="space-y-4">
          <Row label="Email">
            <span className="text-[14px] text-t1">{profile.email}</span>
          </Row>
          <Row label="Current plan">
            <span className="flex items-center gap-3">
              <span className="text-[14px] text-t1">{PLANS[profile.plan].name}</span>
              <Link href="/app/billing" className="font-mono text-[12px] text-volt hover:underline">
                Manage
              </Link>
            </span>
          </Row>
          <Row label="Member since">
            <span className="font-mono text-[13px] text-t2">{memberSince(profile.createdAt)}</span>
          </Row>
        </dl>
      </section>

      {/* Appearance */}
      <section className="rounded-[20px] border border-border bg-card p-6">
        <h2 className="mb-1 font-syne text-[18px] font-semibold text-t1">Appearance</h2>
        <p className="mb-5 text-[13px] text-t2">Choose how RotPitch looks on this device.</p>
        <ThemeSwitcher />
      </section>

      {/* Session */}
      <section className="rounded-[20px] border border-border bg-card p-6">
        <h2 className="mb-1 font-syne text-[18px] font-semibold text-t1">Session</h2>
        <p className="mb-5 text-[13px] text-t2">Sign out of RotPitch on this device.</p>
        <SignOutButton />
      </section>

      {/* Danger zone */}
      <section className="rounded-[20px] border border-error/30 bg-error/[0.03] p-6">
        <h2 className="mb-1 flex items-center gap-2 font-syne text-[18px] font-semibold text-error">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.5} /> Danger zone
        </h2>
        <p className="mb-5 text-[13px] text-t2">
          Permanently delete your account and all videos. This can&rsquo;t be undone.
        </p>
        <button
          type="button"
          disabled
          title="Account deletion lands with the API (Phase 4)"
          className="cursor-not-allowed rounded-md border border-error/40 px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-wide text-error opacity-60"
        >
          Delete account
        </button>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <dt className="font-mono text-[12px] uppercase tracking-wider text-t2">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

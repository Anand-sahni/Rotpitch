import { Suspense } from 'react';
import { Brand } from '@/components/Brand';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Log in · RotPitch' };

export default function LoginPage() {
  return (
    <>
      <div className="flex flex-col items-center rounded-lg border border-border bg-card p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
        <Brand className="mb-10" />

        <header className="mb-8 text-center">
          <h1 className="font-syne text-2xl font-semibold tracking-tight text-t1">Welcome back</h1>
        </header>

        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </div>

      {/* System status meta (Stitch) */}
      <div className="mt-6 flex justify-center gap-10 opacity-40">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-volt" />
          <span className="font-mono text-[11px] uppercase tracking-tight">System Operational</span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-tight">v2.4.0-PRO</span>
      </div>
    </>
  );
}

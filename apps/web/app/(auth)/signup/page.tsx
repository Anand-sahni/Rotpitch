import { Suspense } from 'react';
import { Brand } from '@/components/Brand';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Sign up · RotPitch' };

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-card p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
      <Brand className="mb-10" />

      <header className="mb-8 text-center">
        <h1 className="mb-2 font-syne text-2xl font-semibold tracking-tight text-t1">
          Create your account
        </h1>
        <p className="text-[15px] text-t2">
          Start with{' '}
          <span className="rounded-full bg-volt-dim px-2 py-1 font-mono text-[12px] text-volt">
            1 free credit
          </span>{' '}
          — no card required
        </p>
      </header>

      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>

      <div className="mt-8 w-full border-t border-border pt-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-t3">
          Engineered for high-velocity creators.
        </p>
      </div>
    </div>
  );
}

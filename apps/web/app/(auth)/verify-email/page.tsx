import { Suspense } from 'react';
import { Brand } from '@/components/Brand';
import { VerifyOtpForm } from '@/components/auth/VerifyOtpForm';

export const metadata = { title: 'Verify your email · RotPitch' };

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-card p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
      <Brand className="mb-10" />

      <header className="mb-8 text-center">
        <h1 className="mb-2 font-syne text-2xl font-semibold tracking-tight text-t1">
          Check your email
        </h1>
        <p className="text-[15px] text-t2">Enter the code to activate your account.</p>
      </header>

      <Suspense>
        <VerifyOtpForm />
      </Suspense>
    </div>
  );
}

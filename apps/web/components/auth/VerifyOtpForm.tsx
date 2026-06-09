'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { safeInternalPath } from '@/lib/safe-redirect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Confirm a new signup by entering the 6-digit code emailed by Supabase
 * (verifyOtp, type 'signup'). On success the session is established and we head
 * into the app. Requires the "Confirm signup" email template to include the
 * code token ({{ .Token }}).
 */
export function VerifyOtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const redirectedFrom = safeInternalPath(params.get('redirectedFrom'));

  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  if (!email) {
    return (
      <div className="w-full text-center text-[15px] text-t2">
        <p>We don&apos;t know which email to verify.</p>
        <Link
          href="/signup"
          className="mt-4 inline-block font-medium text-volt underline-offset-4 hover:underline"
        >
          Back to sign up
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const token = code.trim();
    if (!/^\d{6}$/.test(token)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    setPending(false);
    if (verifyError) {
      setError(verifyError.message || 'That code is invalid or expired.');
      return;
    }
    router.push(redirectedFrom);
    router.refresh();
  }

  async function onResend() {
    setError(null);
    setResent(false);
    const { error: resendError } = await createClient().auth.resend({ type: 'signup', email });
    if (resendError) setError(resendError.message);
    else setResent(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-5">
      <p className="text-center text-[15px] text-t2">
        We sent a 6-digit code to <span className="text-t1">{email}</span>.
      </p>

      <div className="space-y-2">
        <label htmlFor="code" className="block font-mono text-[12px] uppercase tracking-[0.08em] text-t2">
          Verification code
        </label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center font-mono text-[22px] tracking-[0.5em]"
          required
        />
      </div>

      {error && <p className="text-[13px] text-error">{error}</p>}
      {resent && <p className="text-[13px] text-success">A new code is on its way.</p>}

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
        {pending ? 'Verifying…' : 'Verify & continue'}
      </Button>

      <p className="text-center text-[15px] text-t2">
        Didn&apos;t get it?{' '}
        <button
          type="button"
          onClick={onResend}
          className="font-medium text-volt underline-offset-4 hover:underline"
        >
          Resend code
        </button>
      </p>
    </form>
  );
}

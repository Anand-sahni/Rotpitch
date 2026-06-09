'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { credentialsSchema } from '@rotpitch/shared';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Request a password-reset link. Supabase emails a recovery link pointing at
 * /auth/callback?redirectedFrom=/reset-password, which exchanges the code for a
 * session and lands the user on the set-new-password screen.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = credentialsSchema.shape.email.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email');
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/auth/callback?redirectedFrom=/reset-password`,
    });
    setPending(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full text-center">
        <p className="text-[15px] text-t2">
          If an account exists for <span className="text-t1">{email}</span>, a reset link is on its
          way. Check your inbox.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block font-medium text-volt underline-offset-4 hover:underline"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block font-mono text-[12px] uppercase tracking-[0.08em] text-t2">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-[13px] text-error">{error}</p>}

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>

      <p className="mt-2 text-center text-[15px] text-t2">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-volt underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

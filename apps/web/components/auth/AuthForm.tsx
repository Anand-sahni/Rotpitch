'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { credentialsSchema } from '@rotpitch/shared';
import { createClient } from '@/lib/supabase/client';
import { safeInternalPath } from '@/lib/safe-redirect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Mode = 'login' | 'signup';

/** Maps `?error=` codes (set by the auth callback) to human messages. */
const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: 'That sign-in link was invalid or expired. Please try again.',
};

const GoogleGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
    />
    <path
      fill="#FBBC05"
      d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
    />
  </svg>
);

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = safeInternalPath(searchParams.get('redirectedFrom'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    ERROR_MESSAGES[searchParams.get('error') ?? ''] ?? null,
  );

  const isSignup = mode === 'signup';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setPending(true);
    const supabase = createClient();
    try {
      if (isSignup) {
        // 1 free credit is awarded server-side by the DB signup trigger.
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          // Email confirmation disabled → signed in immediately, go to the app.
          router.push(redirectedFrom);
          router.refresh();
        } else {
          // Confirmation enabled → collect the OTP code sent to their email.
          const params = new URLSearchParams({ email: parsed.data.email });
          if (redirectedFrom !== '/app') params.set('redirectedFrom', redirectedFrom);
          router.push(`/verify-email?${params.toString()}`);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (signInError) throw signInError;
        router.push(redirectedFrom);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectedFrom=${encodeURIComponent(redirectedFrom)}`,
      },
    });
    if (oauthError) setError(oauthError.message);
  }

  const labelClass = 'block font-mono text-[12px] uppercase tracking-[0.08em] text-t2';

  return (
    <div className="w-full">
      <Button
        variant="ghost"
        size="md"
        className="group w-full font-dm font-medium"
        onClick={onGoogle}
        type="button"
      >
        <GoogleGlyph />
        <span className="transition-transform group-hover:translate-x-px">Continue with Google</span>
      </Button>

      <div className="my-4 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[12px] uppercase tracking-[0.05em] text-t2">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="space-y-2">
          <label htmlFor="email" className={labelClass}>
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

        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            {!isSignup && (
              <Link
                href="/forgot-password"
                className="font-mono text-[12px] uppercase tracking-[0.05em] text-volt transition hover:brightness-110"
              >
                Forgot?
              </Link>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 transition-colors hover:text-t1"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <Eye className="h-5 w-5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {error && <p className="text-[13px] text-error">{error}</p>}

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
          {pending ? 'Just a sec…' : isSignup ? 'Create account' : 'Log in'}
        </Button>
      </form>

      <p className="mt-8 text-center text-[15px] text-t2">
        {isSignup ? 'Already have an account?' : 'New to RotPitch?'}{' '}
        <Link
          href={isSignup ? '/login' : '/signup'}
          className="font-medium text-volt underline-offset-4 hover:underline"
        >
          {isSignup ? 'Log in' : 'Create an account'}
        </Link>
      </p>
    </div>
  );
}

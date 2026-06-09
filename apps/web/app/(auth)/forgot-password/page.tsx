import { Brand } from '@/components/Brand';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata = { title: 'Reset password · RotPitch' };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-card p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
      <Brand className="mb-10" />

      <header className="mb-8 text-center">
        <h1 className="mb-2 font-syne text-2xl font-semibold tracking-tight text-t1">
          Reset your password
        </h1>
        <p className="text-[15px] text-t2">We&apos;ll email you a secure link to set a new one.</p>
      </header>

      <ForgotPasswordForm />
    </div>
  );
}

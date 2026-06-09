import { Brand } from '@/components/Brand';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = { title: 'Set a new password · RotPitch' };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-card p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
      <Brand className="mb-10" />

      <header className="mb-8 text-center">
        <h1 className="mb-2 font-syne text-2xl font-semibold tracking-tight text-t1">
          Set a new password
        </h1>
        <p className="text-[15px] text-t2">Choose a strong password for your account.</p>
      </header>

      <ResetPasswordForm />
    </div>
  );
}

import { AuroraField } from '@/components/auth/AuroraField';

/**
 * Auth layout (ported from the Stitch Sign Up / Log In screens): a single
 * centered card floating over an atmospheric aurora field. Marketing type
 * (Syne / DM Sans) to match the public landing surface.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-dm relative flex min-h-screen items-center justify-center overflow-hidden bg-base px-6 py-10">
      <AuroraField />
      <main className="relative z-10 w-full max-w-[420px]">{children}</main>
    </div>
  );
}

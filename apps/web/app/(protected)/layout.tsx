import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/data';
import { SideNav } from '@/components/app/SideNav';
import { AppHeader } from '@/components/app/AppHeader';

/**
 * Protected app shell (Stitch dashboard): fixed sidebar + top bar wrapping all
 * authenticated screens. Middleware redirects unauthenticated users; this is
 * the defence-in-depth render-time guard. Plan + credits come from the real
 * `users` profile row.
 */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  return (
    <div className="font-dm min-h-screen bg-base text-t1">
      <SideNav plan={profile.plan} credits={profile.creditsBalance} />
      <div className="ml-60">
        <AppHeader email={profile.email} />
        <main className="px-8 pb-12 pt-24">{children}</main>
      </div>
    </div>
  );
}

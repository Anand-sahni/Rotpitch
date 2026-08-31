'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { resetAnalytics } from '@/lib/analytics';

export function SignOutButton() {
  const router = useRouter();
  async function onSignOut() {
    await createClient().auth.signOut();
    // Unbind the PostHog person, or the next user to sign in on this browser
    // inherits the previous one's identity.
    resetAnalytics();
    router.push('/login');
    router.refresh();
  }
  return (
    <Button variant="ghost" size="sm" onClick={onSignOut}>
      Sign out
    </Button>
  );
}

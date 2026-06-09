'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export function SignOutButton() {
  const router = useRouter();
  async function onSignOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }
  return (
    <Button variant="ghost" size="sm" onClick={onSignOut}>
      Sign out
    </Button>
  );
}

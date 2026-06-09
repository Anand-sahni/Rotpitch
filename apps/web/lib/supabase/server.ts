import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@rotpitch/shared/db';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Server Supabase client for Server Components / Route Handlers / Server
 * Actions. Reads & writes the auth cookies. Anon key only — never the service
 * role (that lives in apps/api).
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookie writes are ignored here;
            // the middleware refresh handles session persistence.
          }
        },
      },
    },
  );
}

/** Convenience: the current authenticated user, or null. */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

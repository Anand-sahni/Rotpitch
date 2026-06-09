import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from '../env.js';

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY inside the API for
 * privileged, server-enforced writes (credits, video status, billing). Never
 * expose this client or its key to the browser.
 *
 * Intentionally UNTYPED (no <Database> generic): this client only does
 * server-side admin writes/RPCs, which we validate with zod and shape with
 * explicit interfaces (VideoRecord, UserProfile). supabase-js v2.106 changed
 * its typed-client generics in ways that don't fit our hand-written Database
 * type for inserts/updates/rpc; the generated types would restore typing, but
 * the admin path doesn't need it.
 *
 * Node < 22 has no global WebSocket, but supabase-js eagerly constructs a
 * realtime client at createClient time. We never use realtime server-side, so
 * we just hand it the `ws` transport to satisfy the constructor.
 */
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    // `ws` satisfies the realtime constructor on Node < 22 (no global WebSocket).
    // Cast: ws's signature is wider than supabase's WebSocketLikeConstructor.
    realtime: { transport: ws as never },
  },
);

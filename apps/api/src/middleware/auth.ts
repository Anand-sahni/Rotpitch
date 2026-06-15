import type { NextFunction, Request, Response } from 'express';
import type { UserProfile } from '@rotpitch/shared';
import { supabaseAdmin } from '../lib/supabase.js';
import { Unauthorized } from '../lib/errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by requireAuth: the authenticated user's profile row. */
      user?: UserProfile;
    }
  }
}

/**
 * Validates the Supabase JWT from the Authorization header, then loads (and if
 * necessary provisions) the user's profile row. Attaches it as req.user.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    const token = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
    if (!token) throw Unauthorized('Missing bearer token');

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) throw Unauthorized('Invalid or expired token');

    const authUser = data.user;
    const profile = await ensureUserProfile(authUser.id, authUser.email ?? '');
    req.user = profile;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Idempotent fallback for the DB signup trigger: ensures a users row exists on
 * first authenticated request (Free plan, 1 free credit) and logs the grant.
 */
async function ensureUserProfile(id: string, email: string): Promise<UserProfile> {
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (existing) return mapUser(existing);

  const { data: created, error } = await supabaseAdmin
    .from('users')
    .insert({ id, email, plan: 'free', credits_balance: 1, credits_expires_at: null })
    .select('*')
    .single();
  if (error || !created) throw Unauthorized('Could not provision user profile');

  await supabaseAdmin
    .from('credit_transactions')
    .insert({ user_id: id, amount: 1, type: 'signup' });

  return mapUser(created);
}

// Until generated DB types are wired, the row shape is loosely typed here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- row shape comes from generated types post-codegen
export function mapUser(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email,
    plan: row.plan,
    creditsBalance: row.credits_balance,
    creditsExpiresAt: row.credits_expires_at,
    billingCycleStart: row.billing_cycle_start,
    dodoCustomerId: row.dodo_customer_id ?? null,
    createdAt: row.created_at,
  };
}

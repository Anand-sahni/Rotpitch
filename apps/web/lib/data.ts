import 'server-only';
import type { PlanId, VideoFormat, VideoStatus } from '@rotpitch/shared';
import { PLAN_IDS } from '@rotpitch/shared';
import { createClient } from '@/lib/supabase/server';
import { presignOutput } from '@/lib/s3';
import {
  backgroundLabel,
  backgroundPreviewUrl,
  type BackgroundStyle,
} from '@/lib/backgrounds';

/**
 * Server-only data layer. Reads the authenticated user's own rows (RLS enforces
 * ownership; these selects assume the session user). All display-shaping lives
 * in lib/format.ts — these functions return domain-shaped data only.
 */

export interface Profile {
  id: string;
  email: string;
  plan: PlanId;
  creditsBalance: number;
  creditsExpiresAt: string | null;
  createdAt: string | null;
}

function isPlanId(v: string): v is PlanId {
  return (PLAN_IDS as readonly string[]).includes(v);
}

/**
 * The authenticated user's profile row. Falls back to free-tier defaults if the
 * row is missing (e.g. the signup trigger hasn't landed yet) so the shell never
 * hard-fails on a transient gap.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, email, plan, credits_balance, credits_expires_at, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) {
    return {
      id: user.id,
      email: user.email ?? '',
      plan: 'free',
      creditsBalance: 0,
      creditsExpiresAt: null,
      createdAt: null,
    };
  }

  return {
    id: data.id,
    email: data.email,
    plan: isPlanId(data.plan) ? data.plan : 'free',
    creditsBalance: data.credits_balance,
    creditsExpiresAt: data.credits_expires_at,
    createdAt: data.created_at,
  };
}

export interface VideoRow {
  id: string;
  status: VideoStatus;
  outputUrl: string | null;
  backgroundStyle: string;
  format: VideoFormat;
  hasCaptions: boolean;
  hasVoiceover: boolean;
  hasWatermark: boolean;
  batchId: string | null;
  failureReason: string | null;
  createdAt: string;
}

/** The authenticated user's videos, newest first. */
export async function getVideos(): Promise<VideoRow[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('videos')
    .select(
      'id, status, output_url, background_style, format, has_captions, has_voiceover, has_watermark, batch_id, failure_reason, created_at',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  // output_url holds the S3 object key; presign it to a usable URL (legacy
  // full-URL rows pass through unchanged). Signing is local (no network), so
  // mapping the page's worth of rows in parallel is cheap.
  return Promise.all(
    data.map(async (v) => ({
      id: v.id,
      status: v.status,
      outputUrl: await presignOutput(v.output_url),
      backgroundStyle: v.background_style,
      format: v.format,
      hasCaptions: v.has_captions,
      hasVoiceover: v.has_voiceover,
      hasWatermark: v.has_watermark,
      batchId: v.batch_id,
      failureReason: v.failure_reason,
      createdAt: v.created_at,
    })),
  );
}

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i;

/**
 * Every background loop in the public `backgrounds` bucket, sorted by name.
 * Must sort the same way the API does (name ascending) so positional plan
 * gating agrees. Listing needs a SELECT policy on the bucket (migration 0004).
 */
export async function getBackgrounds(): Promise<BackgroundStyle[]> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('backgrounds')
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error || !data) return [];

  return data
    .filter((o) => o.id !== null && VIDEO_EXT.test(o.name))
    .map((o) => o.name)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      label: backgroundLabel(name),
      previewUrl: backgroundPreviewUrl(name),
    }));
}

export interface CreditTxRow {
  id: string;
  amount: number;
  type: 'signup' | 'purchase' | 'use' | 'refund';
  createdAt: string;
}

/** The authenticated user's recent credit ledger, newest first. */
export async function getCreditTransactions(limit = 25): Promise<CreditTxRow[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('id, amount, type, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((t) => ({
    id: t.id,
    amount: t.amount,
    type: t.type,
    createdAt: t.created_at,
  }));
}

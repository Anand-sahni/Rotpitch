import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../lib/errors.js';
import type { VideoFormat } from '@rotpitch/shared';

/** Server-side video row operations (service role; RLS bypassed). */

export interface NewVideo {
  userId: string;
  inputUrl: string;
  backgroundStyle: string;
  format: VideoFormat;
  hasCaptions: boolean;
  hasVoiceover: boolean;
  hasWatermark: boolean;
  batchId: string | null;
}

export interface VideoRecord {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  input_url: string;
  output_url: string | null;
  background_style: string;
  format: VideoFormat;
  has_watermark: boolean;
  batch_id: string | null;
  failure_reason: string | null;
  created_at: string;
}

/** Insert one or more pending video rows; returns the created rows. */
export async function createVideos(rows: NewVideo[]): Promise<VideoRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .insert(
      rows.map((r) => ({
        user_id: r.userId,
        status: 'pending' as const,
        input_url: r.inputUrl,
        background_style: r.backgroundStyle,
        format: r.format,
        has_captions: r.hasCaptions,
        has_voiceover: r.hasVoiceover,
        has_watermark: r.hasWatermark,
        batch_id: r.batchId,
      })),
    )
    .select('*');

  if (error || !data) {
    throw new AppError(500, 'video_create_failed', `Could not create video rows: ${error?.message}`);
  }
  return data as VideoRecord[];
}

/** Delete video rows by id (used to roll back if the credit charge fails). */
export async function deleteVideos(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await supabaseAdmin.from('videos').delete().in('id', ids);
}

export async function setVideoStatus(id: string, status: VideoRecord['status']): Promise<void> {
  await supabaseAdmin.from('videos').update({ status }).eq('id', id);
}

export async function setVideoDone(id: string, outputUrl: string): Promise<void> {
  await supabaseAdmin.from('videos').update({ status: 'done', output_url: outputUrl }).eq('id', id);
}

export async function setVideoFailed(id: string, reason?: string): Promise<void> {
  await supabaseAdmin
    .from('videos')
    .update({ status: 'failed', failure_reason: reason ?? null })
    .eq('id', id);
}

/** How many of the user's videos still reference a given raw upload path. */
export async function countVideosByInput(userId: string, inputUrl: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('videos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('input_url', inputUrl);
  return count ?? 0;
}

export async function getVideo(id: string, userId: string): Promise<VideoRecord | null> {
  const { data } = await supabaseAdmin
    .from('videos')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  return (data as VideoRecord | null) ?? null;
}

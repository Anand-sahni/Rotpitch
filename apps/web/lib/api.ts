'use client';

import { createClient } from '@/lib/supabase/client';
import type { GenerateVideoInput, AutoGenerateInput } from '@rotpitch/shared';

/**
 * Browser → API client. The video pipeline lives in apps/api (Express); the web
 * app uploads the raw file straight to Supabase Storage, then hands the API the
 * object path. Every request carries the Supabase access token as a bearer.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const RAW_BUCKET = 'raw-uploads';

async function authedFetch<T>(
  path: string,
  opts: { method?: 'POST' | 'DELETE' | 'GET'; body?: unknown } = {},
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Your session expired — please sign in again.');

  const headers: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'POST',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Request failed (${res.status})`);
  return json as T;
}

/** Upload the raw pitch video to the user's own folder; returns the object path. */
export async function uploadRawVideo(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Your session expired — please sign in again.');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const objectPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(RAW_BUCKET).upload(objectPath, file, {
    contentType: file.type || 'video/mp4',
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return objectPath;
}

/**
 * Upload a user-supplied background loop to the user's own folder and return its
 * object path. Lives in the same raw-uploads bucket as the demo (under a `bg/`
 * subfolder so it's distinguishable); the API wraps the path as `custom:<path>`
 * and the render worker reads it from there.
 */
export async function uploadCustomBackground(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Your session expired — please sign in again.');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const objectPath = `${user.id}/bg/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(RAW_BUCKET).upload(objectPath, file, {
    contentType: file.type || 'video/mp4',
    upsert: false,
  });
  if (error) throw new Error(`Background upload failed: ${error.message}`);
  return objectPath;
}

export function generateVideo(input: GenerateVideoInput) {
  return authedFetch<{ video: { id: string; status: string } }>('/api/videos/generate', {
    body: input,
  });
}

export function autoGenerateVideos(input: AutoGenerateInput) {
  return authedFetch<{ batchId: string; videos: { id: string; status: string }[] }>(
    '/api/videos/auto-generate',
    { body: input },
  );
}

export function deleteVideo(id: string) {
  return authedFetch<{ ok: true }>(`/api/videos/${id}`, { method: 'DELETE' });
}

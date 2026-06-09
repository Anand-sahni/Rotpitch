-- =============================================================================
-- RotPitch — Storage buckets & RLS policies
--
-- Three buckets:
--   backgrounds  (public read)  — owner-supplied loop library, {style_key}.mp4
--   raw-uploads  (private)      — user pitch uploads, {userId}/{videoId}.<ext>
--   outputs      (public read)  — finished renders, {userId}/{videoId}.mp4
--
-- Public buckets serve reads via the public object URL regardless of RLS, and
-- the service role (apps/api worker) bypasses RLS for all writes. The only
-- client-side write is the browser uploading a raw pitch video to its own
-- folder in `raw-uploads`, so that's the one policy we need.
-- =============================================================================

-- Buckets (idempotent). 50 MB upload cap + video-only MIME allowlist on raw
-- uploads — enforced by Storage regardless of the (untrusted) client. The
-- worker still re-validates with ffprobe (codec/duration). Background loops and
-- finished outputs are unrestricted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('backgrounds', 'backgrounds', true,  null,     null),
  ('raw-uploads', 'raw-uploads', false, 52428800,
     array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']),
  ('outputs',     'outputs',     true,  null,     null)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may LIST the backgrounds bucket (the loop library is not secret, and
-- the bucket is already public-read by URL). Required so the web Create screen
-- can enumerate the loops via the anon/authenticated client; the API enumerates
-- via the service role (which bypasses RLS anyway).
drop policy if exists "backgrounds_select_all" on storage.objects;
create policy "backgrounds_select_all"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'backgrounds');

-- Browser (authenticated) may upload into raw-uploads under its own uid folder.
drop policy if exists "raw_uploads_insert_own" on storage.objects;
create policy "raw_uploads_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'raw-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ...and read/overwrite/remove its own raw uploads.
drop policy if exists "raw_uploads_select_own" on storage.objects;
create policy "raw_uploads_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'raw-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "raw_uploads_update_own" on storage.objects;
create policy "raw_uploads_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'raw-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- RotPitch — videos.failure_reason
--
-- When a render fails (invalid/too-long upload, ffmpeg error, etc.) the worker
-- stores a short, user-facing reason here so the dashboard can explain *why*
-- instead of a bare "Export Failed". Null while pending/processing/done.
-- =============================================================================

alter table public.videos
  add column if not exists failure_reason text;

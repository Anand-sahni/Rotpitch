import { z } from 'zod';

/**
 * Server-side environment. The service-role key lives ONLY here — never in
 * apps/web. Fail fast at boot if anything required is missing.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
  // Supabase Storage buckets — raw uploads + the background loop catalog stay on
  // Supabase. Finished render OUTPUT now lives in AWS S3 (see below).
  RAW_BUCKET: z.string().default('raw-uploads'),
  BACKGROUND_BUCKET: z.string().default('backgrounds'),
  // AWS S3 — finished render output (private bucket, presigned GET on read).
  // Credentials come from the SDK default chain: an EC2 instance role in prod,
  // or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY env vars locally.
  AWS_REGION: z.string().default('us-east-1'),
  S3_OUTPUT_BUCKET: z.string().default('rotpitch-outputs'),
  // Lifetime of a presigned output URL (seconds). The dashboard re-signs on each
  // server render, so this only needs to outlast a viewing session.
  S3_PRESIGN_EXPIRES_SEC: z.coerce.number().int().positive().default(3600),
  // OpenAI hosted transcription (Whisper) — powers auto-captions. Optional so the
  // API/worker still boot without it; a caption job without a key fails with a
  // clear, user-facing reason (and refunds the credit).
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_TRANSCRIBE_MODEL: z.string().default('whisper-1'),
  // ffmpeg/ffprobe binaries. Overridable so a dev box can point at a
  // libass-enabled build without relinking the system ffmpeg.
  FFMPEG_BIN: z.string().default('ffmpeg'),
  FFPROBE_BIN: z.string().default('ffprobe'),
  // Cap ffmpeg/x264 thread count. In a container ffmpeg otherwise sees the
  // HOST's full core count and x264 pre-allocates per-thread lookahead frame
  // buffers at the output resolution — at 1080×1920 that balloons to multiple GB
  // and the kernel OOM-kills the process the instant encoding starts. A small
  // cap keeps memory bounded; clips are short so throughput is unaffected.
  FFMPEG_THREADS: z.coerce.number().int().positive().default(2),
  // Concurrent renders per worker. Each in-flight job runs a full 1080×1920
  // ffmpeg encode, so peak memory scales LINEARLY with this. Default 1 keeps a
  // small instance from OOM-killing two parallel encodes; raise it only
  // if you've sized the worker's RAM accordingly.
  RENDER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  // x264 lookahead window (frames). The lookahead module buffers this many
  // decoded frames at the output resolution; bounding it caps a memory term the
  // thread cap doesn't. 10 = the `veryfast` preset default.
  FFMPEG_RC_LOOKAHEAD: z.coerce.number().int().nonnegative().default(10),
  // Hard wall-clock cap on a single ffmpeg render (ms). Renders are ~8 s, so the
  // 3-min default is a generous backstop: a hung encode is SIGKILLed and the job
  // fails cleanly (mark failed + refund) instead of holding its lock forever and
  // stranding the video on "processing".
  RENDER_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),
});

export const env = envSchema.parse(process.env);

import { z } from 'zod';

/**
 * Server-side environment. The service-role key lives ONLY here — never in
 * apps/web. Fail fast at boot if anything required is missing.
 */

/**
 * An optional secret/string that also treats an empty value ('') as "unset", so
 * a blank line in .env (e.g. a not-yet-filled key) is the same as omitting it
 * and doesn't fail boot. Plain `.optional()` only accepts an ABSENT var.
 */
const optionalStr = z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional());

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
  // S3-compatible object storage — finished render output (private bucket,
  // presigned GET on read). Production runs on Cloudflare R2: set S3_ENDPOINT to
  // the account endpoint (https://<acct>.r2.cloudflarestorage.com) and
  // AWS_REGION=auto. With S3_ENDPOINT unset the client targets AWS S3.
  // Credentials always come from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
  AWS_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: optionalStr,
  S3_OUTPUT_BUCKET: z.string().default('rotpitch-outputs'),
  // Lifetime of a presigned output URL (seconds). The dashboard re-signs on each
  // server render, so this only needs to outlast a viewing session.
  S3_PRESIGN_EXPIRES_SEC: z.coerce.number().int().positive().default(3600),
  // On-disk cache for catalog background loops (services/backgroundCache.ts).
  // The same few backgrounds are re-downloaded on every render and average
  // ~14.7 MB, making them the majority of per-render storage egress. Cache dir
  // defaults to a subdir of the OS temp dir; point it at a mounted volume to
  // survive redeploys. MAX_MB = 0 disables caching entirely.
  BACKGROUND_CACHE_DIR: optionalStr,
  BACKGROUND_CACHE_MAX_MB: z.coerce.number().int().nonnegative().default(512),
  // OpenAI hosted transcription (Whisper) — powers auto-captions. Optional so the
  // API/worker still boot without it; a caption job without a key fails with a
  // clear, user-facing reason (and refunds the credit).
  OPENAI_API_KEY: optionalStr,
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

  // Shared secret for GET /health/queue, the render-queue telemetry the staff
  // admin console (RotPitch Manager) reads. Unset = the endpoint is disabled
  // (503), so a deploy without the key exposes nothing.
  MANAGER_HEALTH_KEY: optionalStr,

  // ---- Dodo Payments (billing) ----------------------------------------------
  // Single Merchant of Record (global USD + India INR). All optional so the API
  // still boots without billing configured; the billing routes return a clear
  // 503 when the key is missing, and the webhook route 503s without its secret.
  DODO_PAYMENTS_API_KEY: optionalStr,
  DODO_PAYMENTS_ENVIRONMENT: z.enum(['test_mode', 'live_mode']).default('test_mode'),
  DODO_PAYMENTS_WEBHOOK_KEY: optionalStr,
  // One Dodo subscription product id (pdt_…) per paid plan.
  DODO_PRODUCT_BASIC: optionalStr,
  DODO_PRODUCT_POPULAR: optionalStr,
  DODO_PRODUCT_PRO: optionalStr,
  // One Dodo ONE-TIME product id (pdt_…) per credit pack. Independent of the
  // subscription products above: top-ups stay unavailable (503) until these are
  // set, without affecting plan checkout.
  DODO_CREDIT_PACK_SMALL: optionalStr,
  DODO_CREDIT_PACK_MEDIUM: optionalStr,
  DODO_CREDIT_PACK_LARGE: optionalStr,
});

export const env = envSchema.parse(process.env);

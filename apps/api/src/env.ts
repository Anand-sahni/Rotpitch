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
  // Supabase Storage buckets (S3 is the production target for outputs; for now
  // all three live in Supabase Storage — see CLAUDE.md decisions).
  RAW_BUCKET: z.string().default('raw-uploads'),
  OUTPUT_BUCKET: z.string().default('outputs'),
  BACKGROUND_BUCKET: z.string().default('backgrounds'),
  // OpenAI hosted transcription (Whisper) — powers auto-captions. Optional so the
  // API/worker still boot without it; a caption job without a key fails with a
  // clear, user-facing reason (and refunds the credit).
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_TRANSCRIBE_MODEL: z.string().default('whisper-1'),
  // ffmpeg/ffprobe binaries. Overridable so a dev box can point at a
  // libass-enabled build without relinking the system ffmpeg.
  FFMPEG_BIN: z.string().default('ffmpeg'),
  FFPROBE_BIN: z.string().default('ffprobe'),
});

export const env = envSchema.parse(process.env);

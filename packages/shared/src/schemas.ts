/**
 * Zod schemas for all API payloads. The API validates every request against
 * these; the web client reuses them for form validation. One definition, no
 * duplication.
 */
import { z } from 'zod';
import { BATCH_MIN, BATCH_MAX, VIDEO_FORMATS } from './plans.js';
import {
  CAPTION_PRESET_IDS,
  DEFAULT_CAPTION_PRESET,
  MIN_CAPTION_SCALE,
  MAX_CAPTION_SCALE,
} from './captions.js';

export const videoFormatSchema = z.enum(VIDEO_FORMATS);

/**
 * Zoom range for the edit phase: 0.5× (shrunk + padded within the panel) through
 * 1× (cover-fill) up to 2.5× (tight crop).
 */
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.5;
const scaleSchema = z.number().min(MIN_SCALE).max(MAX_SCALE).default(1);

/**
 * Split ratio = the demo panel's share of the frame (height in 9:16, width in
 * 16:9). 0.5 is an even split; bounded so both panels stay visible.
 */
export const MIN_SPLIT = 0.2;
export const MAX_SPLIT = 0.8;
const splitSchema = z.number().min(MIN_SPLIT).max(MAX_SPLIT).default(0.5);

/**
 * Edit-phase render adjustments, shared by single + batch renders. `productScale`
 * / `backgroundScale` zoom each panel in (cropping tighter); `splitRatio` sets
 * the demo panel's share of the frame; `muted` strips the demo's audio.
 */
export const editOptionsSchema = z.object({
  productScale: scaleSchema,
  backgroundScale: scaleSchema,
  splitRatio: splitSchema,
  muted: z.boolean().default(false),
});
export type EditOptions = z.infer<typeof editOptionsSchema>;

/**
 * Caption placement/style, set in the editor and applied to every output. Only
 * meaningful when `hasCaptions` is true; carried regardless (cheap, and keeps
 * the schema flat). `captionX`/`captionY` are the normalized 0..1 centre of the
 * caption block within the full frame; `captionScale` multiplies the base font.
 */
export const captionOptionsSchema = z.object({
  captionStyle: z.enum(CAPTION_PRESET_IDS).default(DEFAULT_CAPTION_PRESET),
  captionX: z.number().min(0).max(1).default(0.5),
  captionY: z.number().min(0).max(1).default(0.8),
  captionScale: z.number().min(MIN_CAPTION_SCALE).max(MAX_CAPTION_SCALE).default(1),
});
export type CaptionOptions = z.infer<typeof captionOptionsSchema>;

/** A single render configuration (one output video). */
export const generateVideoSchema = z
  .object({
    /** Supabase Storage path/URL of the validated raw upload. */
    inputUrl: z.string().min(1),
    /** Background style key (validated server-side against the asset manifest). */
    backgroundStyle: z.string().min(1),
    format: videoFormatSchema,
    hasCaptions: z.boolean().default(false),
    hasVoiceover: z.boolean().default(false),
  })
  .merge(editOptionsSchema)
  .merge(captionOptionsSchema);
export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;

/**
 * Auto Generate: 2–5 slots, each its own background style; captions/voiceover/
 * format shared across the batch. Credits = number of slots, deducted upfront.
 */
export const autoGenerateSchema = z
  .object({
    inputUrl: z.string().min(1),
    format: videoFormatSchema,
    hasCaptions: z.boolean().default(false),
    hasVoiceover: z.boolean().default(false),
    backgroundStyles: z
      .array(z.string().min(1))
      .min(BATCH_MIN, `Auto Generate needs at least ${BATCH_MIN} videos`)
      .max(BATCH_MAX, `Auto Generate allows at most ${BATCH_MAX} videos`),
  })
  .merge(editOptionsSchema)
  .merge(captionOptionsSchema);
export type AutoGenerateInput = z.infer<typeof autoGenerateSchema>;

/**
 * Start a paid-plan checkout. Gateway is always Dodo Payments (single Merchant
 * of Record), so no gateway field — just the target plan. The server maps the
 * plan to its Dodo `product_id` and returns a hosted Checkout Session URL.
 */
export const checkoutSchema = z.object({
  plan: z.enum(['basic', 'popular', 'pro']),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Pagination for GET /api/videos. */
export const listVideosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.enum(['pending', 'processing', 'done', 'failed']).optional(),
});
export type ListVideosQuery = z.infer<typeof listVideosQuerySchema>;

/** Auth form schemas (reused by the web sign-up / log-in screens). */
export const credentialsSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type Credentials = z.infer<typeof credentialsSchema>;

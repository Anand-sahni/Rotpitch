/**
 * RotPitch plans, gating flags, and credit rules.
 *
 * This is the SINGLE source of truth for plan gating. Both apps/web (display)
 * and apps/api (enforcement) import from here. Never trust the client for
 * gating — the API re-checks every flag against the authenticated user's plan.
 */

export const PLAN_IDS = ['free', 'basic', 'popular', 'pro'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const VIDEO_FORMATS = ['vertical', 'horizontal'] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

/** Auto Generate batch bounds (inclusive). */
export const BATCH_MIN = 2;
export const BATCH_MAX = 5;

/** Credit cost is always 1 per rendered video — single or batch. */
export const CREDIT_COST_PER_VIDEO = 1;

// ---- Raw upload limits ------------------------------------------------------
// Shared by the web dropzone (instant, untrusted UX check) and the render
// worker (authoritative ffprobe check). RotPitch is a short-form tool, so the
// input is capped tight; the size cap matches the raw-uploads bucket limit.
export const MAX_UPLOAD_BYTES = 52_428_800; // 50 MB — matches the bucket cap
export const MAX_INPUT_DURATION_SEC = 60; // short-form: Reels / Shorts / TikTok
export const ACCEPTED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm4v'] as const;
export const ACCEPTED_VIDEO_MIME = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
] as const;

/**
 * Validate an upload's type + size (duration is checked separately — the client
 * reads it from a `<video>` element, the worker via ffprobe). Returns a
 * user-facing error string, or null if the file is acceptable.
 */
export function validateUploadMeta(meta: { name: string; type: string; size: number }): string | null {
  const ext = meta.name.split('.').pop()?.toLowerCase() ?? '';
  const okType =
    (ACCEPTED_VIDEO_MIME as readonly string[]).includes(meta.type) ||
    (ACCEPTED_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
  if (!okType) return `Unsupported file type — use ${ACCEPTED_VIDEO_EXTENSIONS.join(', ')}.`;
  if (meta.size > MAX_UPLOAD_BYTES) {
    return `File is too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`;
  }
  return null;
}

/** Validate a probed/loaded duration in seconds. Returns null if acceptable. */
export function validateDuration(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'Could not read the video — it may be corrupt or not a valid video file.';
  }
  if (seconds > MAX_INPUT_DURATION_SEC) {
    return `Video is too long (max ${MAX_INPUT_DURATION_SEC}s). Trim it and try again.`;
  }
  return null;
}

export interface PlanFeatures {
  /** Number of distinct background styles the plan may use, or 'all'. */
  backgroundStyles: number | 'all';
  autoCaptions: boolean;
  aiVoiceover: boolean;
  formats: readonly VideoFormat[];
  /** Free tier always carries a watermark; paid tiers never do. */
  watermark: boolean;
  autoGenerate: boolean;
  priorityQueue: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  /** Display price in USD. */
  priceUsd: number;
  /** Credits granted per billing cycle (or once, for free). */
  monthlyCredits: number;
  /** Free credits never expire; paid credits reset monthly. */
  creditsExpire: boolean;
  features: PlanFeatures;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceUsd: 0,
    monthlyCredits: 1,
    creditsExpire: false,
    features: {
      backgroundStyles: 5,
      autoCaptions: false,
      aiVoiceover: false,
      formats: ['vertical'],
      watermark: true,
      autoGenerate: false,
      priorityQueue: false,
    },
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    priceUsd: 9.99,
    monthlyCredits: 20,
    creditsExpire: true,
    features: {
      backgroundStyles: 'all',
      autoCaptions: true,
      aiVoiceover: false,
      formats: ['vertical'],
      watermark: false,
      autoGenerate: true,
      priorityQueue: false,
    },
  },
  popular: {
    id: 'popular',
    name: 'Popular',
    priceUsd: 19.99,
    monthlyCredits: 40,
    creditsExpire: true,
    features: {
      backgroundStyles: 'all',
      autoCaptions: true,
      aiVoiceover: true,
      formats: ['vertical', 'horizontal'],
      watermark: false,
      autoGenerate: true,
      priorityQueue: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUsd: 49.99,
    monthlyCredits: 100,
    creditsExpire: true,
    features: {
      backgroundStyles: 'all',
      autoCaptions: true,
      aiVoiceover: true,
      formats: ['vertical', 'horizontal'],
      watermark: false,
      autoGenerate: true,
      priorityQueue: true,
    },
  },
};

/** Paid plans only (used by the subscriptions table + billing). */
export const PAID_PLAN_IDS = ['basic', 'popular', 'pro'] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

export function isPaidPlan(plan: PlanId): plan is PaidPlanId {
  return plan !== 'free';
}

/** Whether a plan may render in a given format. */
export function planAllowsFormat(plan: PlanId, format: VideoFormat): boolean {
  return PLANS[plan].features.formats.includes(format);
}

/** Whether a plan may run Auto Generate batches. */
export function planAllowsAutoGenerate(plan: PlanId): boolean {
  return PLANS[plan].features.autoGenerate;
}

/** Free tier may use only the first N background styles (by listing order). */
export const FREE_STYLE_COUNT = 5;

/**
 * Whether a plan may use the background at position `index` in the (name-sorted)
 * background list. Backgrounds are now whatever lives in the `backgrounds`
 * bucket — there is no fixed key list — so gating is purely positional: the free
 * tier unlocks the first `backgroundStyles` entries, paid tiers unlock all.
 * Web and API must sort the bucket the same way (name ascending) so the index
 * agrees on both sides.
 */
export function planAllowsStyleAt(plan: PlanId, index: number): boolean {
  const limit = PLANS[plan].features.backgroundStyles;
  return limit === 'all' ? true : index < limit;
}

/**
 * Custom (user-uploaded) backgrounds. A custom background isn't a catalog object
 * — it's a pointer to the user's own upload in the raw-uploads bucket, carried in
 * `videos.background_style` as `custom:<rawObjectPath>`. The render worker reads
 * the path from raw-uploads instead of the backgrounds bucket.
 */
export const CUSTOM_BACKGROUND_PREFIX = 'custom:';

/** True when a background style id refers to a user-uploaded custom background. */
export function isCustomBackground(style: string): boolean {
  return style.startsWith(CUSTOM_BACKGROUND_PREFIX);
}

/** The raw-uploads object path inside a `custom:<path>` id, or null if not custom. */
export function customBackgroundPath(style: string): string | null {
  return isCustomBackground(style) ? style.slice(CUSTOM_BACKGROUND_PREFIX.length) : null;
}

/**
 * Whether a plan may upload its own background. Gated to paid tiers (the free
 * tier is limited to the first `FREE_STYLE_COUNT` catalog styles) — i.e. any
 * plan with unlimited catalog access also gets custom uploads.
 */
export function planAllowsCustomBackground(plan: PlanId): boolean {
  return PLANS[plan].features.backgroundStyles === 'all';
}

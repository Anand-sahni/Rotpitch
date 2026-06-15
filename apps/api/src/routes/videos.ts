import { Router } from 'express';
import type { Router as RouterType } from 'express';
import {
  generateVideoSchema,
  autoGenerateSchema,
  PLANS,
  planAllowsFormat,
  planAllowsAutoGenerate,
  planAllowsStyleAt,
  planAllowsCustomBackground,
  isCustomBackground,
  customBackgroundPath,
  type PlanId,
} from '@rotpitch/shared';
import { requireAuth } from '../middleware/auth.js';
import { AppError, BadRequest, Forbidden } from '../lib/errors.js';
import {
  createVideos,
  deleteVideos,
  getVideo,
  countVideosByInput,
  type NewVideo,
} from '../services/videoService.js';
import { deductCredits } from '../services/creditService.js';
import { reconcileBilling } from '../services/billingService.js';
import { removeObject, listBackgrounds } from '../services/storage.js';
import { presignOutput, deleteOutput } from '../services/s3.js';
import { renderQueue, PRIORITY, type RenderJob } from '../lib/queue.js';
import { env } from '../env.js';

export const videosRouter: RouterType = Router();

/**
 * Validate one background style for this user. Custom uploads (`custom:<path>`)
 * must point at the user's own raw upload and require a paid plan; catalog styles
 * must exist in the bucket and clear positional plan-gating. Pass `catalog` to
 * reuse a single `listBackgrounds()` across a batch.
 */
async function assertBackgroundAllowed(
  style: string,
  userId: string,
  plan: PlanId,
  catalog?: string[],
): Promise<void> {
  if (isCustomBackground(style)) {
    if (!planAllowsCustomBackground(plan)) throw Forbidden('Custom backgrounds require an upgrade');
    const path = customBackgroundPath(style);
    if (!path || !path.startsWith(`${userId}/`)) throw Forbidden('Custom background does not belong to you');
    return;
  }
  const backgrounds = catalog ?? (await listBackgrounds());
  const idx = backgrounds.indexOf(style);
  if (idx < 0) throw BadRequest(`Unknown background "${style}"`);
  if (!planAllowsStyleAt(plan, idx)) throw Forbidden(`Background "${style}" not available on your plan`);
}

/** Enqueue a render job, Pro plans first. */
async function enqueue(job: RenderJob, plan: string) {
  await renderQueue.add('render', job, {
    jobId: job.videoId,
    priority: plan === 'pro' ? PRIORITY.high : PRIORITY.normal,
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

/**
 * POST /api/videos/generate — single render.
 * Validates → enforces gating → creates the row → charges 1 credit → enqueues.
 */
videosRouter.post('/generate', requireAuth, async (req, res, next) => {
  try {
    // Lazy-expiry fallback: refill/downgrade if a renewal/expiry webhook was missed.
    const user = await reconcileBilling(req.user!);
    const body = generateVideoSchema.parse(req.body);
    const plan = user.plan;
    const features = PLANS[plan].features;

    // Server-side gating — never trust the client.
    if (!body.inputUrl.startsWith(`${user.id}/`)) throw Forbidden('Upload does not belong to you');
    await assertBackgroundAllowed(body.backgroundStyle, user.id, plan);
    if (!planAllowsFormat(plan, body.format)) throw Forbidden('Format not available on your plan');
    if (body.hasCaptions && !features.autoCaptions) throw Forbidden('Captions require an upgrade');
    // AI voiceover is "coming soon" — not implemented yet, so reject it on every
    // path regardless of plan (the worker ignores the flag; never charge for it).
    if (body.hasVoiceover) throw Forbidden('AI voiceover is coming soon');

    const created = await createVideos([
      {
        userId: user.id,
        inputUrl: body.inputUrl,
        backgroundStyle: body.backgroundStyle,
        format: body.format,
        hasCaptions: body.hasCaptions,
        hasVoiceover: body.hasVoiceover,
        hasWatermark: features.watermark,
        batchId: null,
      },
    ]);
    const video = created[0];
    if (!video) throw new AppError(500, 'video_create_failed', 'Render row was not created');

    try {
      await deductCredits(user.id, [video.id]);
    } catch (err) {
      await deleteVideos([video.id]); // roll back the pending row on payment failure
      throw err;
    }

    await enqueue(
      {
        videoId: video.id,
        userId: user.id,
        inputPath: body.inputUrl,
        backgroundStyle: body.backgroundStyle,
        format: body.format,
        hasWatermark: features.watermark,
        hasCaptions: body.hasCaptions,
        captionStyle: body.captionStyle,
        captionX: body.captionX,
        captionY: body.captionY,
        captionScale: body.captionScale,
        productScale: body.productScale,
        backgroundScale: body.backgroundScale,
        splitRatio: body.splitRatio,
        muted: body.muted,
      },
      plan,
    );

    res.status(202).json({ video: { id: video.id, status: video.status } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/videos/auto-generate — batch of 2–5, one background per slot.
 * Whole batch is charged upfront and blocked if credits can't cover it.
 */
videosRouter.post('/auto-generate', requireAuth, async (req, res, next) => {
  try {
    const user = await reconcileBilling(req.user!);
    const body = autoGenerateSchema.parse(req.body);
    const plan = user.plan;
    const features = PLANS[plan].features;

    if (!planAllowsAutoGenerate(plan)) throw Forbidden('Auto Generate requires an upgrade');
    if (!body.inputUrl.startsWith(`${user.id}/`)) throw Forbidden('Upload does not belong to you');
    if (!planAllowsFormat(plan, body.format)) throw Forbidden('Format not available on your plan');
    if (body.hasCaptions && !features.autoCaptions) throw Forbidden('Captions require an upgrade');
    // AI voiceover is "coming soon" — not implemented yet, so reject it on every
    // path regardless of plan (the worker ignores the flag; never charge for it).
    if (body.hasVoiceover) throw Forbidden('AI voiceover is coming soon');
    if (new Set(body.backgroundStyles).size !== body.backgroundStyles.length)
      throw BadRequest('Background styles must be distinct');
    const catalog = await listBackgrounds();
    for (const style of body.backgroundStyles) {
      await assertBackgroundAllowed(style, user.id, plan, catalog);
    }

    const batchId = crypto.randomUUID();
    const rows: NewVideo[] = body.backgroundStyles.map((style) => ({
      userId: user.id,
      inputUrl: body.inputUrl,
      backgroundStyle: style,
      format: body.format,
      hasCaptions: body.hasCaptions,
      hasVoiceover: body.hasVoiceover,
      hasWatermark: features.watermark,
      batchId,
    }));

    const videos = await createVideos(rows);

    try {
      await deductCredits(user.id, videos.map((v) => v.id));
    } catch (err) {
      await deleteVideos(videos.map((v) => v.id));
      throw err;
    }

    await Promise.all(
      videos.map((v) =>
        enqueue(
          {
            videoId: v.id,
            userId: user.id,
            inputPath: body.inputUrl,
            backgroundStyle: v.background_style,
            format: body.format,
            hasWatermark: features.watermark,
            hasCaptions: body.hasCaptions,
            captionStyle: body.captionStyle,
            captionX: body.captionX,
            captionY: body.captionY,
            captionScale: body.captionScale,
            productScale: body.productScale,
            backgroundScale: body.backgroundScale,
            splitRatio: body.splitRatio,
            muted: body.muted,
          },
          plan,
        ),
      ),
    );

    res.status(202).json({ batchId, videos: videos.map((v) => ({ id: v.id, status: v.status })) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/videos/:id — status poll for a single video (own rows only). */
videosRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: { code: 'bad_request', message: 'Missing id' } });
    const video = await getVideo(id, req.user!.id);
    if (!video) return res.status(404).json({ error: { code: 'not_found', message: 'Video not found' } });
    res.json({
      video: {
        id: video.id,
        status: video.status,
        // Stored value is an S3 object key; mint a short-lived presigned URL.
        outputUrl: await presignOutput(video.output_url),
        format: video.format,
        failureReason: video.failure_reason,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/videos/:id — remove the user's own video (row + output object).
 * No credit refund — the credit was spent on a render that ran; deletion is a
 * user action, not a failed render. The raw upload is removed only if no other
 * video (e.g. an Auto Generate sibling) still references it.
 */
videosRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: { code: 'bad_request', message: 'Missing id' } });
    const user = req.user!;

    const video = await getVideo(id, user.id);
    if (!video) return res.status(404).json({ error: { code: 'not_found', message: 'Video not found' } });

    // Drop a still-queued render job if it hasn't started (no-op if absent).
    await renderQueue.remove(id).catch(() => {});

    // Delete the row first so the sibling count below excludes this video.
    await deleteVideos([id]);

    // Remove the finished output (S3), then the raw upload if nothing else uses it.
    await deleteOutput(`${user.id}/${id}.mp4`);
    if ((await countVideosByInput(user.id, video.input_url)) === 0) {
      await removeObject(env.RAW_BUCKET, video.input_url);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

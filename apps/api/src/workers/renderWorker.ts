import { Worker } from 'bullmq';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { connection, RENDER_QUEUE, type RenderJob } from '../lib/queue.js';
import { env } from '../env.js';
import { validateDuration } from '@rotpitch/shared';
import { downloadTo, uploadFrom, resolveBackgroundSource } from '../services/storage.js';
import { renderComposite, probeDurationSec, probeHasAudio, extractAudio } from '../services/ffmpeg.js';
import { transcribeAudio } from '../services/whisper.js';
import { writeAssFile } from '../services/captions.js';
import { setVideoStatus, setVideoDone, setVideoFailed } from '../services/videoService.js';
import { refundCredit } from '../services/creditService.js';
import { RenderError } from '../lib/errors.js';

/**
 * Render worker: pulls a job, composites product + background with FFmpeg,
 * uploads the result to the public outputs bucket, and marks the video done.
 * Any failure marks the video failed and refunds the credit.
 */
async function process(job: { data: RenderJob }): Promise<void> {
  const {
    videoId,
    userId,
    inputPath,
    backgroundStyle,
    format,
    hasWatermark,
    hasCaptions,
    captionStyle,
    captionX,
    captionY,
    captionScale,
    productScale,
    backgroundScale,
    splitRatio,
    muted,
  } = job.data;
  const work = await mkdtemp(join(tmpdir(), `rotpitch-${videoId}-`));
  const productPath = join(work, `product${extname(inputPath) || '.mp4'}`);
  const backgroundPath = join(work, 'bg.mp4');
  const audioPath = join(work, 'audio.mp3');
  const subtitlesPath = join(work, 'captions.ass');
  const outputPath = join(work, 'out.mp4');

  try {
    await setVideoStatus(videoId, 'processing');

    await downloadTo(env.RAW_BUCKET, inputPath, productPath);

    // Authoritative upload validation (the browser checks are untrusted UX).
    // ffprobe proves the file is a real, decodable video and gives its length.
    let durationSec: number;
    try {
      durationSec = await probeDurationSec(productPath);
    } catch {
      throw new RenderError('Could not read the uploaded video — it may be corrupt or not a valid video file.');
    }
    const durationErr = validateDuration(durationSec);
    if (durationErr) throw new RenderError(durationErr);

    const bg = resolveBackgroundSource(backgroundStyle);
    await downloadTo(bg.bucket, bg.objectPath, backgroundPath);

    // Auto-captions: transcribe the demo's speech (Whisper) and burn it in via
    // libass. Source with no audio → nothing to caption; we render without
    // captions rather than fail. A transcription/API error fails the job (and
    // refunds) since the user explicitly requested captions.
    let burnSubtitles: string | undefined;
    if (hasCaptions) {
      if (await probeHasAudio(productPath)) {
        await extractAudio(productPath, audioPath);
        const segments = await transcribeAudio(audioPath);
        if (segments.length > 0) {
          await writeAssFile(
            segments,
            format,
            {
              style: captionStyle ?? 'classic',
              x: captionX ?? 0.5,
              y: captionY ?? 0.8,
              scale: captionScale ?? 1,
            },
            subtitlesPath,
          );
          burnSubtitles = subtitlesPath;
        } else {
          // eslint-disable-next-line no-console
          console.log(`[worker] ${videoId} captions requested but no speech detected — rendering without`);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(`[worker] ${videoId} captions requested but the demo has no audio — rendering without`);
      }
    }

    await renderComposite({
      productPath,
      backgroundPath,
      outputPath,
      format,
      watermark: hasWatermark,
      productScale,
      backgroundScale,
      splitRatio,
      muted,
      subtitlesPath: burnSubtitles,
      durationSec,
    });

    const objectPath = `${userId}/${videoId}.mp4`;
    const publicUrl = await uploadFrom(env.OUTPUT_BUCKET, objectPath, outputPath, 'video/mp4');

    await setVideoDone(videoId, publicUrl);
    // eslint-disable-next-line no-console
    console.log(`[worker] done ${videoId} -> ${publicUrl}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

export function startRenderWorker(): Worker<RenderJob> {
  const worker = new Worker<RenderJob>(RENDER_QUEUE, process, { connection, concurrency: 2 });

  worker.on('failed', async (job, err) => {
    if (!job) return;
    // Validation failures carry a user-facing message; anything else gets a
    // sanitized reason so we never leak ffmpeg/internal detail to the dashboard.
    const reason =
      err instanceof RenderError
        ? err.message
        : 'Render failed unexpectedly. Your credit was refunded — please try again.';
    // eslint-disable-next-line no-console
    console.error(`[worker] failed ${job.data.videoId}:`, err.message);
    await setVideoFailed(job.data.videoId, reason);
    await refundCredit(job.data.userId, job.data.videoId);
  });

  // eslint-disable-next-line no-console
  worker.on('ready', () => console.log(`[worker] render worker ready on "${RENDER_QUEUE}"`));
  return worker;
}

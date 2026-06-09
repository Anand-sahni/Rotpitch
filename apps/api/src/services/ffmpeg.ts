import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { VideoFormat } from '@rotpitch/shared';
import { env } from '../env.js';

/**
 * The core RotPitch render: a split-screen composite of the user's product demo
 * over a high-retention background loop. 9:16 stacks them vertically (product
 * top / background bottom); 16:9 places them side by side. The background is
 * looped and the output ends with the product (-shortest). Free renders get the
 * RotPitch logo overlaid bottom-right — done with `overlay` (a PNG) rather than
 * `drawtext`, so it doesn't depend on an ffmpeg built with libfreetype.
 */

interface RenderOpts {
  productPath: string;
  backgroundPath: string;
  outputPath: string;
  format: VideoFormat;
  watermark: boolean;
  /** Panel zoom factors (1 = cover-fill, <1 = shrunk + padded). Clamped to [0.5, 2.5]. */
  productScale?: number;
  backgroundScale?: number;
  /** Demo panel's share of the frame (height in 9:16, width in 16:9). Clamped to [0.2, 0.8]. */
  splitRatio?: number;
  /** Drop the demo's audio from the output. */
  muted?: boolean;
  /** Absolute path to an ASS subtitle file to burn in (libass). Captions sit on
   * top of the composite (and watermark). Omitted = no captions. */
  subtitlesPath?: string;
  /** Hard output-duration cap (seconds), normally the probed product length. A
   * backstop so `-shortest` + an infinitely-looped background can never run
   * forever (e.g. a silent demo). Omitted = rely on `-shortest` alone. */
  durationSec?: number;
}

/** Clamp a zoom factor to the supported range, defaulting to 1 (no zoom). */
function clampScale(s: number | undefined): number {
  if (!s || Number.isNaN(s)) return 1;
  return Math.min(2.5, Math.max(0.5, s));
}

/** Clamp the split ratio, defaulting to an even 0.5 split. */
function clampSplit(s: number | undefined): number {
  if (!s || Number.isNaN(s)) return 0.5;
  return Math.min(0.8, Math.max(0.2, s));
}

/** Round to the nearest even number ≥ 2 (libx264 yuv420p needs even dims). */
function even(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

const FRAME: Record<VideoFormat, { w: number; h: number; stack: 'vstack' | 'hstack' }> = {
  vertical: { w: 1080, h: 1920, stack: 'vstack' },
  horizontal: { w: 1920, h: 1080, stack: 'hstack' },
};

/**
 * Per-panel pixel dimensions for a given format + split. 9:16 divides the height
 * (vstack needs equal widths); 16:9 divides the width (hstack needs equal heights).
 * The demo gets `ratio` of the divided axis, the background the remainder.
 */
function panelDims(format: VideoFormat, ratio: number) {
  const f = FRAME[format];
  if (format === 'vertical') {
    const productH = even(f.h * ratio);
    return { frame: f, product: { w: f.w, h: productH }, bg: { w: f.w, h: f.h - productH } };
  }
  const productW = even(f.w * ratio);
  return { frame: f, product: { w: productW, h: f.h }, bg: { w: f.w - productW, h: f.h } };
}

// Bundled watermark mark (white RotPitch logo). Resolved relative to this file
// so it works under both tsx (src) and node (dist).
const WATERMARK_PATH = fileURLToPath(new URL('../../assets/watermark.png', import.meta.url));

function hasWatermarkAsset(): boolean {
  return existsSync(WATERMARK_PATH);
}

function buildFilter(opts: RenderOpts, withWatermark: boolean): string {
  const p = panelDims(opts.format, clampSplit(opts.splitRatio));
  // Fit a source into its panel at a given zoom factor. factor 1 == cover-fill.
  // factor > 1 covers a larger box then centre-crops back to the panel (zoom in).
  // factor < 1 covers a smaller box then centre-pads to the panel (zoom out, with
  // the surrounding area filled black).
  const cell = (dim: { w: number; h: number }, factor: number) => {
    if (factor >= 1) {
      return (
        `scale=${even(dim.w * factor)}:${even(dim.h * factor)}:` +
        `force_original_aspect_ratio=increase,crop=${dim.w}:${dim.h},setsar=1`
      );
    }
    const bw = even(dim.w * factor);
    const bh = even(dim.h * factor);
    return (
      `scale=${bw}:${bh}:force_original_aspect_ratio=increase,crop=${bw}:${bh},setsar=1,` +
      `pad=${dim.w}:${dim.h}:${(dim.w - bw) / 2}:${(dim.h - bh) / 2}:color=black`
    );
  };
  const parts = [
    `[0:v]${cell(p.product, clampScale(opts.productScale))}[a]`,
    `[1:v]${cell(p.bg, clampScale(opts.backgroundScale))}[b]`,
    `[a][b]${p.frame.stack}=inputs=2[stacked]`,
  ];

  // Compose into [base] (watermark optional), then burn captions on top so they
  // sit above both panels and the mark.
  const subs = opts.subtitlesPath ? `subtitles=${escapeFilterPath(opts.subtitlesPath)}` : null;
  const tail = subs ? '[base]' : '[v]';
  if (withWatermark) {
    const markW = Math.round(p.frame.w / 5);
    parts.push(`[2:v]scale=${markW}:-1,format=rgba,colorchannelmixer=aa=0.9[wm]`);
    parts.push(`[stacked][wm]overlay=W-w-40:H-h-40${tail}`);
  } else {
    parts.push(`[stacked]null${tail}`);
  }
  if (subs) parts.push(`[base]${subs}[v]`);
  return parts.join(';');
}

/**
 * Escape a filesystem path for use as a filtergraph option value (the
 * `subtitles` filter splits options on `:` and treats `\`/`'` specially).
 * POSIX temp paths rarely contain these, but escape defensively.
 */
function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

export function buildFFmpegArgs(opts: RenderOpts): string[] {
  const withWatermark = opts.watermark && hasWatermarkAsset();
  // Bound thread usage up front: in a container x264 otherwise spawns ~1.5× the
  // host core count and pre-allocates per-thread frame buffers at the output
  // resolution, OOM-killing the process at encode start. Caps both the codec
  // (`-threads`) and the filtergraph (`-filter_complex_threads`).
  const threads = String(env.FFMPEG_THREADS);
  const args = ['-y', '-threads', threads, '-filter_complex_threads', threads];
  args.push('-i', opts.productPath, '-stream_loop', '-1', '-i', opts.backgroundPath);
  if (withWatermark) args.push('-loop', '1', '-i', WATERMARK_PATH);
  args.push(
    '-filter_complex', buildFilter(opts, withWatermark),
    '-map', '[v]',
  );
  // Carry the demo's audio unless muted (background loop has none).
  if (opts.muted) {
    args.push('-an');
  } else {
    args.push('-map', '0:a?', '-c:a', 'aac');
  }
  args.push(
    '-c:v', 'libx264',
    '-threads', threads,
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-shortest',
  );
  // Hard duration cap: a backstop against `-shortest` + `-stream_loop -1` never
  // terminating (e.g. a silent demo with an infinitely looped background).
  if (opts.durationSec && Number.isFinite(opts.durationSec) && opts.durationSec > 0) {
    args.push('-t', opts.durationSec.toFixed(3));
  }
  args.push(
    '-movflags', '+faststart',
    opts.outputPath,
  );
  return args;
}

/**
 * Probe a media file's duration in seconds via ffprobe. Rejects if ffprobe
 * can't parse the file (not a real/decodable video) — the worker uses this as
 * the authoritative upload check, since the browser can't be trusted.
 */
export function probeDurationSec(path: string): Promise<number> {
  const args = [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    path,
  ];
  return new Promise((resolve, reject) => {
    const proc = spawn(env.FFPROBE_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c) => (stdout += c.toString()));
    proc.stderr.on('data', (c) => (stderr += c.toString()));
    proc.on('error', (err) => reject(new Error(`ffprobe spawn failed: ${err.message}`)));
    proc.on('close', (code) => {
      const seconds = Number.parseFloat(stdout.trim());
      if (code !== 0 || !Number.isFinite(seconds)) {
        reject(new Error(`ffprobe could not read the file: ${stderr.slice(-400) || `exit ${code}`}`));
        return;
      }
      resolve(seconds);
    });
  });
}

/** True if the file has at least one audio stream (no audio → nothing to caption). */
export function probeHasAudio(path: string): Promise<boolean> {
  const args = [
    '-v', 'error',
    '-select_streams', 'a',
    '-show_entries', 'stream=index',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    path,
  ];
  return new Promise((resolve) => {
    const proc = spawn(env.FFPROBE_BIN, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let stdout = '';
    proc.stdout.on('data', (c) => (stdout += c.toString()));
    proc.on('error', () => resolve(false));
    proc.on('close', () => resolve(stdout.trim().length > 0));
  });
}

/**
 * Extract a mono 16 kHz MP3 of the input's audio for transcription. Whisper
 * wants speech, not fidelity — this keeps the upload small and fast. Rejects if
 * ffmpeg can't produce audio (caller should have checked probeHasAudio first).
 */
export function extractAudio(inputPath: string, outPath: string): Promise<void> {
  const args = [
    '-y', '-i', inputPath,
    '-vn', '-ac', '1', '-ar', '16000',
    '-c:a', 'libmp3lame', '-q:a', '5',
    outPath,
  ];
  return new Promise((resolve, reject) => {
    const proc = spawn(env.FFMPEG_BIN, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (c) => {
      stderr += c.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    proc.on('error', (err) => reject(new Error(`ffmpeg(audio) spawn failed: ${err.message}`)));
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg(audio) exited ${code}: ${stderr.slice(-600)}`)),
    );
  });
}

/** Run ffmpeg; resolves on exit 0, rejects with the tail of stderr otherwise. */
export function renderComposite(opts: RenderOpts): Promise<void> {
  const args = buildFFmpegArgs(opts);
  return new Promise((resolve, reject) => {
    const proc = spawn(env.FFMPEG_BIN, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    proc.on('error', (err) => reject(new Error(`ffmpeg spawn failed: ${err.message}`)));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-1200)}`));
    });
  });
}

import { writeFile } from 'node:fs/promises';
import {
  captionPreset,
  CAPTION_BASE_FONT,
  type VideoFormat,
  type CaptionPreset,
} from '@rotpitch/shared';
import type { TranscriptSegment } from './whisper.js';

/**
 * Turn timed transcript segments into a styled ASS subtitle file for libass to
 * burn in via ffmpeg's `subtitles` filter. Placement + size + look all come
 * from the editor (`CaptionRenderOptions`), so what the user positioned in the
 * preview is what renders.
 *
 * Positioning uses `\an5\pos(cx,cy)` (centre anchor at the normalized point);
 * text is pre-wrapped here with `\N` so line breaks are deterministic rather
 * than depending on libass auto-wrap under `\pos`.
 *
 * NOTE: the font is resolved by fontconfig at render time. Locally that falls
 * back to a system sans (Arial on macOS); for prod (Railway) a brand font
 * should be bundled and passed via the subtitles filter's `fontsdir` — tracked
 * as a Phase 9 follow-up.
 */

export interface CaptionRenderOptions {
  style: string; // preset id
  x: number; // 0..1 centre
  y: number; // 0..1 centre
  scale: number; // font-size multiplier
}

const FRAME: Record<VideoFormat, { w: number; h: number; baseChars: number }> = {
  vertical: { w: 1080, h: 1920, baseChars: 22 },
  horizontal: { w: 1920, h: 1080, baseChars: 42 },
};

/** ASS timestamp: H:MM:SS.cc (centiseconds). */
function assTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const cs = Math.min(99, Math.round((clamped - Math.floor(clamped)) * 100));
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** #RRGGBB → ASS &HAABBGGRR (opaque). */
function hexToAss(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const rgb = m ? m[1]! : 'ffffff';
  const r = rgb.slice(0, 2);
  const g = rgb.slice(2, 4);
  const b = rgb.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

/** Escape Dialogue text: drop override braces, normalize newlines to \N. */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/[{}]/g, '')
    .replace(/\r?\n/g, ' ')
    .trim();
}

/** Greedy word-wrap into lines of at most `maxChars`, joined with the ASS \N break. */
function wrap(text: string, maxChars: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line.length === 0) line = w;
    else if (line.length + 1 + w.length <= maxChars) line += ` ${w}`;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.join('\\N');
}

/** Build the V4+ style line from a preset at a given font size + outline width. */
function styleLine(preset: CaptionPreset, fontSize: number, outline: number): string {
  const primary = hexToAss(preset.textColor);
  const outlineColour = hexToAss(preset.outlineColor);
  const back = preset.box ? hexToAss(preset.outlineColor) : '&H80000000';
  const bold = preset.bold ? -1 : 0;
  const borderStyle = preset.box ? 3 : 1; // 3 = opaque box, 1 = outline + shadow
  const shadow = preset.box ? 0 : 2;
  // Name,Fontname,Fontsize,Primary,Secondary,Outline,Back,Bold,Italic,Underline,
  // StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,
  // MarginL,MarginR,MarginV,Encoding. Alignment 5 = centre (anchor for \pos).
  return (
    `Style: Default,${preset.fontFamily},${fontSize},${primary},&H000000FF,${outlineColour},${back},` +
    `${bold},0,0,0,100,100,0,0,${borderStyle},${outline},${shadow},5,40,40,40,1`
  );
}

/** Build the ASS document for the given segments + editor options. */
export function buildAss(
  segments: TranscriptSegment[],
  format: VideoFormat,
  opts: CaptionRenderOptions,
): string {
  const f = FRAME[format];
  const preset = captionPreset(opts.style);
  const scale = Math.max(0.6, Math.min(2, opts.scale || 1));
  const fontSize = Math.round(CAPTION_BASE_FONT[format] * scale);
  const outline = Math.max(1, Math.round(preset.outlineWidth * scale));
  const maxChars = Math.max(10, Math.round(f.baseChars / scale));
  const cx = Math.round(Math.max(0, Math.min(1, opts.x)) * f.w);
  const cy = Math.round(Math.max(0, Math.min(1, opts.y)) * f.h);
  const pos = `{\\pos(${cx},${cy})}`;

  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${f.w}`,
    `PlayResY: ${f.h}`,
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    styleLine(preset, fontSize, outline),
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const events = segments.map((seg) => {
    let text = escapeText(seg.text);
    if (preset.uppercase) text = text.toUpperCase();
    return `Dialogue: 0,${assTime(seg.start)},${assTime(seg.end)},Default,,0,0,0,,${pos}${wrap(text, maxChars)}`;
  });

  return [...header, ...events].join('\n') + '\n';
}

/** Build + write the ASS file; returns the path. */
export async function writeAssFile(
  segments: TranscriptSegment[],
  format: VideoFormat,
  opts: CaptionRenderOptions,
  outPath: string,
): Promise<string> {
  await writeFile(outPath, buildAss(segments, format, opts), 'utf8');
  return outPath;
}

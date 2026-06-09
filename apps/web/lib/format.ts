import type { VideoRow } from '@/lib/data';
import type { VideoCardData, VideoStatus as CardStatus } from '@/components/app/VideoCard';

/** Compact relative time, e.g. "Just now", "3h ago", "2 days ago". */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day} days ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return wk === 1 ? '1 week ago' : `${wk} weeks ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return mo === 1 ? '1 month ago' : `${mo} months ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Background style id → display title. The id is now the bucket object name
 * (e.g. "Temple Run.mp4" or a legacy "minecraft_parkour"), so strip a trailing
 * video extension, then tidy separators. Names with their own casing/spacing
 * (e.g. "GTA V driving in Los Santos") are preserved as-is.
 */
export function humanizeStyle(style: string): string {
  // User-uploaded backgrounds carry an opaque `custom:<path>` id — show a label.
  if (style.startsWith('custom:')) return 'Custom background';
  const noExt = style.replace(/\.(mp4|mov|webm|m4v)$/i, '');
  // Legacy snake/kebab keys have no spaces — prettify those; leave real names.
  const cleaned = /\s/.test(noExt) ? noExt.trim() : noExt.replace(/[_-]+/g, ' ').trim();
  if (!cleaned) return 'Untitled clip';
  return /\s/.test(noExt) ? cleaned : cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Deterministic decorative gradient so a given video always looks the same.
const TONES = [
  'from-violet/40 to-cyan/20',
  'from-cyan/30 to-volt/20',
  'from-cyan/20 to-volt/10',
  'from-volt/30 to-cyan/20',
  'from-cyan/20 to-violet/30',
] as const;

function toneFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length] ?? TONES[0];
}

/** Map a DB video row to the presentational VideoCard shape. */
export function videoRowToCard(v: VideoRow): VideoCardData {
  // The card has no `pending` visual; surface it as processing.
  const status: CardStatus = v.status === 'pending' ? 'processing' : (v.status as CardStatus);
  return {
    id: v.id,
    title: humanizeStyle(v.backgroundStyle),
    format: v.format,
    status,
    when: relativeTime(v.createdAt),
    batch: v.batchId ? 'Batch' : undefined,
    tone: toneFor(v.id),
    outputUrl: v.outputUrl ?? undefined,
    failureReason: v.failureReason ?? undefined,
  };
}

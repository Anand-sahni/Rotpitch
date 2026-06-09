/**
 * Caption styling — one source of truth shared by the web preview (CSS) and the
 * render worker (libass ASS). A preset is described in neutral visual terms
 * (colours as #RRGGBB, outline width in px at the 1080-wide baseline); each
 * consumer maps it to its own format. Position + size are per-render, set in the
 * editor: `captionX`/`captionY` are the normalized 0..1 centre of the caption
 * block within the full frame, `captionScale` multiplies the base font size.
 */

export interface CaptionPreset {
  id: string;
  label: string;
  /** Font family resolved by libass/fontconfig server-side and the browser in preview. */
  fontFamily: string;
  /** Text fill colour. */
  textColor: string;
  /** Outline colour (or the box fill when `box` is true). */
  outlineColor: string;
  /** Outline thickness in px at a 1080-wide frame; scaled per output/preview. */
  outlineWidth: number;
  bold: boolean;
  uppercase: boolean;
  /** Render a filled box behind the text instead of a stroke outline. */
  box: boolean;
}

export const CAPTION_PRESETS: readonly CaptionPreset[] = [
  {
    id: 'classic',
    label: 'Classic',
    fontFamily: 'Arial',
    textColor: '#FFFFFF',
    outlineColor: '#000000',
    outlineWidth: 4,
    bold: true,
    uppercase: false,
    box: false,
  },
  {
    id: 'punch',
    label: 'Punch',
    fontFamily: 'Arial',
    textColor: '#FFE45C',
    outlineColor: '#000000',
    outlineWidth: 5,
    bold: true,
    uppercase: true,
    box: false,
  },
  {
    id: 'boxed',
    label: 'Boxed',
    fontFamily: 'Arial',
    textColor: '#FFFFFF',
    outlineColor: '#0B0B0E',
    outlineWidth: 6,
    bold: true,
    uppercase: false,
    box: true,
  },
  {
    id: 'volt',
    label: 'Volt',
    fontFamily: 'Arial',
    textColor: '#CBFF3D',
    outlineColor: '#0A0A0A',
    outlineWidth: 4,
    bold: true,
    uppercase: false,
    box: false,
  },
  {
    id: 'clean',
    label: 'Clean',
    fontFamily: 'Arial',
    textColor: '#FFFFFF',
    outlineColor: '#000000',
    outlineWidth: 2,
    bold: false,
    uppercase: false,
    box: false,
  },
] as const;

/** Preset ids as a tuple, for building the zod enum. */
export const CAPTION_PRESET_IDS = CAPTION_PRESETS.map((p) => p.id) as [string, ...string[]];

export const DEFAULT_CAPTION_PRESET = 'classic';

/** Base font size (px) per format at `captionScale` = 1, on the full-res frame. */
export const CAPTION_BASE_FONT: Record<'vertical' | 'horizontal', number> = {
  vertical: 64,
  horizontal: 52,
};

/** Caption size range (multiplier on the base font). */
export const MIN_CAPTION_SCALE = 0.6;
export const MAX_CAPTION_SCALE = 2;

/** Look up a preset by id, falling back to the default. */
export function captionPreset(id: string | undefined): CaptionPreset {
  return CAPTION_PRESETS.find((p) => p.id === id) ?? CAPTION_PRESETS[0]!;
}

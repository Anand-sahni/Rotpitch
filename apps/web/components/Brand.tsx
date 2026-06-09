import { cn } from '@/lib/cn';
import { DEFAULT_BRAND_VARIANT, type BrandVariant } from '@/lib/brand';

/** Original layer-stack mark (violet back panel + volt front panel + play glyph). */
function LayerMark({ className, decorative }: { className?: string; decorative: boolean }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'RotPitch' })}
    >
      <rect x="40" y="88" width="136" height="136" rx="36" fill="#9D7BFF" />
      <rect x="88" y="40" width="136" height="136" rx="36" fill="#CBFF3D" />
      <path d="M146 84 L146 132 L184 108 Z" fill="#0C0C10" />
    </svg>
  );
}

/**
 * Clapperboard + price-tag mark (video × pitch). Cuts (clapper stripes, the
 * moat around the tag, the tag hole) are punched via a mask so they read as the
 * background on any surface. The mask id is shared across instances — the
 * definition is identical, so repeated use resolves correctly.
 */
function ClapperMark({ className, decorative }: { className?: string; decorative: boolean }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'RotPitch' })}
    >
      <defs>
        <mask id="rp-mark-clapper">
          <rect width="256" height="256" fill="#000" />
          <rect x="46" y="54" width="126" height="36" rx="10" fill="#fff" />
          <rect x="46" y="96" width="126" height="104" rx="26" fill="#fff" />
          <g fill="#000">
            <polygon points="64,50 80,50 68,94 52,94" />
            <polygon points="100,50 116,50 104,94 88,94" />
            <polygon points="136,50 152,50 140,94 124,94" />
          </g>
          <g transform="rotate(40 158 158)">
            <rect x="116" y="116" width="84" height="84" rx="24" fill="#000" />
          </g>
          <g transform="rotate(40 158 158)">
            <rect x="126" y="126" width="64" height="64" rx="18" fill="#fff" />
          </g>
          <circle cx="150" cy="150" r="9" fill="#000" />
        </mask>
      </defs>
      <rect width="256" height="256" fill="#CBFF3D" mask="url(#rp-mark-clapper)" />
    </svg>
  );
}

/**
 * RotPitch lockup: brand mark + Syne wordmark ("Rot" light, "Pitch"
 * volt). The mark defaults to DEFAULT_BRAND_VARIANT (see lib/brand.ts) — flip
 * that to switch the logo site-wide — or override per usage with `variant`.
 * Pass `markOnly` to render just the glyph.
 */
export function Brand({
  className,
  markOnly = false,
  variant = DEFAULT_BRAND_VARIANT,
}: {
  className?: string;
  markOnly?: boolean;
  variant?: BrandVariant;
}) {
  const Mark = variant === 'clapper' ? ClapperMark : LayerMark;
  return (
    <span className={cn('inline-flex items-center gap-[4px]', className)}>
      <Mark className="h-[38px] w-[38px] shrink-0" decorative={!markOnly} />
      {!markOnly && (
        <span className="font-display text-[19px] font-semibold tracking-tight">
          <span className="text-t1">Rot</span>
          <span className="text-volt">Pitch</span>
        </span>
      )}
    </span>
  );
}

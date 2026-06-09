/**
 * Brand mark variants.
 *
 *  - 'clapper' — clapperboard + price-tag (video × pitch). Default.
 *  - 'layers'  — original layer-stack mark (violet + volt panels + play glyph).
 *
 * Flip DEFAULT_BRAND_VARIANT to switch the logo everywhere `<Brand />` is used
 * (nav, footer, auth, dashboard sidebar). Any single usage can also override
 * with `<Brand variant="layers" />`.
 */
export type BrandVariant = 'clapper' | 'layers';

export const DEFAULT_BRAND_VARIANT: BrandVariant = 'layers';

import type { Config } from 'tailwindcss';

/**
 * RotPitch design system → Tailwind theme.
 *
 * Token VALUES come from the PRD/Design-System spec (RotPitch_Spec_and_Design_
 * System.html). Colors reference CSS variables defined in app/globals.css so the
 * three theme variants (Studio Dark / Daylight / Hypergloss) swap with no class
 * changes. Token NAMES match the spec: base/surface/card/elevated/border, volt/
 * signal/nebula/aurora, etc.
 *
 * Stitch MCP was unavailable when this was seeded, so these are the baseline
 * spec values — reconcile with Stitch when access is provided.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens are rgb(var(--*-rgb) / <alpha-value>) — the channel triplets
        // live next to each hex var in globals.css per theme — so /opacity
        // modifiers (bg-base/80, border-volt/40, …) actually compile. Plain
        // 'var(--x)' colors make Tailwind v3 silently drop those classes.
        // Surfaces
        base: 'rgb(var(--bg-base-rgb) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
        card: 'rgb(var(--bg-card-rgb) / <alpha-value>)',
        elevated: 'rgb(var(--bg-elevated-rgb) / <alpha-value>)',
        border: 'rgb(var(--border-rgb) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong-rgb) / <alpha-value>)',
        // Brand / accent
        volt: {
          DEFAULT: 'rgb(var(--volt-rgb) / <alpha-value>)',
          hover: 'rgb(var(--volt-hover-rgb) / <alpha-value>)',
          dim: 'var(--volt-dim)',
        },
        violet: 'rgb(var(--violet-rgb) / <alpha-value>)',
        magenta: 'rgb(var(--magenta-rgb) / <alpha-value>)',
        cyan: 'rgb(var(--cyan-rgb) / <alpha-value>)',
        // Text
        t1: 'rgb(var(--t1-rgb) / <alpha-value>)',
        t2: 'rgb(var(--t2-rgb) / <alpha-value>)',
        t3: 'rgb(var(--t3-rgb) / <alpha-value>)',
        t4: 'rgb(var(--t4-rgb) / <alpha-value>)',
        // Semantic
        success: 'rgb(var(--success-rgb) / <alpha-value>)',
        warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
        error: 'rgb(var(--error-rgb) / <alpha-value>)',
        info: 'rgb(var(--info-rgb) / <alpha-value>)',
      },
      backgroundImage: {
        signal: 'var(--grad-signal)',
        nebula: 'var(--grad-nebula)',
        aurora: 'var(--grad-aurora)',
      },
      borderRadius: {
        xs: 'var(--r-xs)',
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        full: 'var(--r-full)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        ui: 'var(--font-ui)',
        mono: 'var(--font-mono)',
        // Marketing surface (Stitch landing design)
        syne: 'var(--font-syne)',
        dm: 'var(--font-dm)',
      },
      boxShadow: {
        sm: 'var(--sh-sm)',
        md: 'var(--sh-md)',
        lg: 'var(--sh-lg)',
        glow: 'var(--glow)',
      },
      backdropBlur: {
        glass: '18px',
      },
      // 4px spacing grid is Tailwind's default scale; nothing to override.
    },
  },
  plugins: [],
};

export default config;

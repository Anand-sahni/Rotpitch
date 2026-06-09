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
        // Surfaces
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        card: 'var(--bg-card)',
        elevated: 'var(--bg-elevated)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        // Brand / accent
        volt: {
          DEFAULT: 'var(--volt)',
          hover: 'var(--volt-hover)',
          dim: 'var(--volt-dim)',
        },
        violet: 'var(--violet)',
        magenta: 'var(--magenta)',
        cyan: 'var(--cyan)',
        // Text
        t1: 'var(--t1)',
        t2: 'var(--t2)',
        t3: 'var(--t3)',
        t4: 'var(--t4)',
        // Semantic
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        info: 'var(--info)',
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

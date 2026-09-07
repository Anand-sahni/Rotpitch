import type { Metadata, Viewport } from 'next';
import { DM_Sans, JetBrains_Mono, Syne } from 'next/font/google';
import './globals.css';
import { VercelAnalytics } from '@/components/analytics/VercelAnalytics';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';

/**
 * The three Stitch families, self-hosted.
 *
 * next/font downloads the woff2 at BUILD time and serves it from our own
 * origin with a preload hint, which removes the render-blocking
 * fonts.googleapis.com stylesheet that globals.css used to @import — that was
 * a third request chained behind the CSS and the single biggest contributor to
 * LCP render delay on the landing page.
 *
 * `weight` is deliberately omitted: all three are variable fonts on Google
 * Fonts, so one axis file covers every weight the design uses (Syne 400–800,
 * DM Sans 400/500/700, JetBrains Mono 400/500/700) in less bytes than the
 * static cuts. Each exposes a CSS variable that globals.css feeds into
 * --font-syne / --font-dm / --font-mono.
 */
const syne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--rp-font-syne',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--rp-font-dm',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--rp-font-mono',
});

/** Origin of the marketing image bucket, or '' when Supabase isn't configured
 *  (local builds without env) — in which case the preconnect is skipped. */
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin;
  } catch {
    return '';
  }
})();

/**
 * Google Search Console ownership proof, rendered as
 * <meta name="google-site-verification">. Set GOOGLE_SITE_VERIFICATION to the
 * token from Search Console's "HTML tag" method and redeploy; unset renders
 * nothing.
 *
 * This exists for the Google OAuth consent screen. Google shows the root domain
 * of the OAuth callback there — ours is Supabase's, so the sign-in dialog reads
 * "to continue to <project-ref>.supabase.co". Showing "RotPitch" instead needs
 * rotpitch.com listed as an Authorized Domain on the consent screen, and Google
 * only accepts domains already verified in Search Console.
 */
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  title: 'RotPitch — Turn any video into a scroll-stopping clip',
  description:
    'Upload any video, pick a high-retention background, export a viral split-screen clip. Zero editing.',
  ...(GOOGLE_SITE_VERIFICATION
    ? { verification: { google: GOOGLE_SITE_VERIFICATION } }
    : {}),
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/app-icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'RotPitch — go viral in seconds',
    description: 'Turn any video into a viral split-screen clip. No editing.',
    images: [{ url: '/social/og-image-1200x630.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RotPitch — go viral in seconds',
    description: 'Turn any video into a viral split-screen clip. No editing.',
    images: ['/social/og-image-1200x630.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#CBFF3D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // data-theme defaults to Studio Dark (the :root tokens). Set to "daylight" or
  // "hypergloss" to swap themes with no component changes.
  return (
    <html
      lang="en"
      data-theme="studio"
      className={`${syne.variable} ${dmSans.variable} ${jetBrainsMono.variable}`}
    >
      <head>
        {/* Marketing stills (hero diff, variant fan, rot library) all come from
            the Supabase storage origin. Warming the connection during the HTML
            parse takes the TLS handshake off the image request's critical path
            and pulls Speed Index in. */}
        {SUPABASE_ORIGIN && (
          <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
        )}
      </head>
      <body>
        {children}
        {/* Analytics: Vercel = marketing traffic, PostHog = product funnel.
            Both are inert without their keys — see components/analytics. */}
        <VercelAnalytics />
        <PostHogProvider />
      </body>
    </html>
  );
}

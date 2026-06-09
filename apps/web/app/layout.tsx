import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RotPitch — Turn product demos into scroll-stopping video',
  description:
    'Upload a product demo, pick a high-retention background, export a viral split-screen clip. Zero editing.',
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
    description: 'Turn product demos into viral split-screen video. No editing.',
    images: [{ url: '/social/og-image-1200x630.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RotPitch — go viral in seconds',
    description: 'Turn product demos into viral split-screen video. No editing.',
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
    <html lang="en" data-theme="studio">
      <body>{children}</body>
    </html>
  );
}

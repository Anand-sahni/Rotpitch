ROTPITCH — LOGO ASSET PACK (Concept 04 · Layer Stack)
======================================================

FOLDERS
  svg/         Vector masters — use these wherever possible (infinitely scalable)
  png/         Transparent raster exports (16 → 1024px) + white-knockout versions
  favicon/     favicon.ico (16/32/48), favicon.svg, individual favicon PNGs
  app-icons/   apple-touch-icon (180), PWA icons 192/512 (standard + maskable)
  social/      og-image 1200x630, square 1080x1080

  site.webmanifest   PWA manifest (icons + theme color)
  HEAD-SNIPPET.html  Paste into your <head> (adjust paths if not at site root)

WHICH FILE WHEN
  Website logo (header/footer) ....... svg/rotpitch-logo-primary.svg
  On a dark background (UI) ........... svg/rotpitch-logo-mono-white.svg  (or png/rotpitch-logo-white-*.png)
  On a light/white background ......... svg/rotpitch-logo-primary.svg  (or mono-black)
  Single-color / print ............... svg/rotpitch-logo-mono-black.svg | mono-white | mono-volt
  Browser tab ........................ favicon/ (linked via HEAD-SNIPPET.html)
  iOS home screen .................... app-icons/apple-touch-icon.png
  Android / PWA install .............. app-icons/icon-192/512 + maskable + site.webmanifest
  Link previews (social) ............. social/og-image-1200x630.png

BRAND COLORS
  Volt Lime   #CBFF3D   (primary)
  Violet      #9D7BFF   (back panel)
  Ink         #0C0C10   (play glyph)
  Canvas      #09090B   (dark background)

CLEAR SPACE
  Keep padding around the mark equal to the height of the play triangle on all sides.

MINIMUM SIZE
  Mark: 16px (favicon). Below that, detail is lost.

NOTE ON THE WORDMARK
  The OG/social wordmark here uses a stand-in bold font. For production, set
  "RotPitch" in CLASH DISPLAY (600) per the design system — "Rot" in #F4F4F6,
  "Pitch" in #CBFF3D — and re-export if you want a pixel-perfect social image.

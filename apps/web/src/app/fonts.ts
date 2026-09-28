import localFont from "next/font/local";

/** Self-hosted fonts (see src/fonts/README.md). Exposed as CSS variables used by the tokens. */
export const newsreader = localFont({
  src: "../fonts/newsreader-latin-opsz-normal.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--font-newsreader",
  adjustFontFallback: "Times New Roman",
});

export const newsreaderItalic = localFont({
  src: "../fonts/newsreader-latin-wght-italic.woff2",
  weight: "200 800",
  style: "italic",
  display: "swap",
  preload: false,
  variable: "--font-newsreader-italic",
  adjustFontFallback: "Times New Roman",
});

export const plexSans = localFont({
  src: "../fonts/ibm-plex-sans-latin-wght-normal.woff2",
  weight: "100 700",
  style: "normal",
  display: "swap",
  variable: "--font-plex-sans",
  adjustFontFallback: "Arial",
});

export const plexMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-plex-mono",
  adjustFontFallback: false,
});

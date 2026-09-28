import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/env";
import { THEME_COLOR } from "@/lib/theme";
import { newsreader, newsreaderItalic, plexMono, plexSans } from "./fonts";
import "../styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Ibrahim All-Mamun", template: "%s — Ibrahim All-Mamun" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The theme cookie lets the server render the chosen theme (no flash). Reading
  // request data also keeps rendering dynamic, which the per-request CSP nonce needs.
  const theme = (await cookies()).get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;
  return (
    <html
      lang="en-GB"
      data-theme={dataTheme}
      className={`${newsreader.variable} ${newsreaderItalic.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { publicApi } from "@/lib/api/server";
import { THEME_COLOR } from "@/lib/theme";

/** Web app manifest, named from the site settings and profile in the CMS. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Rendered per request so it reflects the CMS rather than build-time data.
  await connection();
  const site = await publicApi.site();
  const siteName = site.ok ? site.data.settings.siteName : "Portfolio";
  const headline = site.ok ? site.data.profile.headline : null;
  return {
    name: headline ? `${siteName} — ${headline}` : siteName,
    short_name: siteName,
    description: site.ok ? site.data.settings.siteDescription : undefined,
    start_url: "/",
    display: "browser",
    background_color: THEME_COLOR.light,
    theme_color: THEME_COLOR.light,
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

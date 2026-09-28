import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { absoluteUrl } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Rendered per request so the origin comes from the runtime APP_URL.
  await connection();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/preview", "/api/", "/internal/", "/search"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

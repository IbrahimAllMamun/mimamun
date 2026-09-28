import type { MetadataRoute } from "next";
import { connection } from "next/server";
import type { StaticRouteKey } from "@portfolio/shared";
import { publicApi } from "@/lib/api/server";
import { absoluteUrl } from "@/lib/seo";

const SECTIONS: { key: StaticRouteKey; path: string; priority: number; prefix?: string }[] = [
  { key: "home", path: "/", priority: 1 },
  { key: "projects", path: "/projects", priority: 0.9, prefix: "/projects/" },
  { key: "research", path: "/research", priority: 0.8, prefix: "/research/" },
  { key: "experience", path: "/experience", priority: 0.8 },
  { key: "about", path: "/about", priority: 0.7 },
  { key: "publications", path: "/publications", priority: 0.6 },
  { key: "certifications", path: "/certifications", priority: 0.5, prefix: "/certifications/" },
  { key: "blog", path: "/blog", priority: 0.6, prefix: "/blog/" },
  { key: "contact", path: "/contact", priority: 0.4 },
];

/**
 * Published, indexable content from the API plus the section pages. Sections
 * without content (no publications, no posts yet) are left out, as are pages
 * whose SEO settings say noindex.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [site, entries, publications] = await Promise.all([
    publicApi.site(),
    publicApi.sitemap(),
    publicApi.publications(),
  ]);
  const content = entries.ok ? entries.data : [];
  const latest = (prefix?: string) =>
    content
      .filter((entry) => !prefix || entry.path.startsWith(prefix))
      .reduce<string | undefined>(
        (max, entry) => (!max || entry.updatedAt > max ? entry.updatedAt : max),
        undefined,
      );

  const sections = SECTIONS.filter((section) => {
    if (site.ok && site.data.routeSeo[section.key]?.noindex) return false;
    if (section.key === "blog") return content.some((entry) => entry.path.startsWith("/blog/"));
    if (section.key === "publications") return publications.ok && publications.data.length > 0;
    return true;
  }).map((section) => ({
    url: absoluteUrl(section.path),
    lastModified: latest(section.prefix),
    changeFrequency: "monthly" as const,
    priority: section.priority,
  }));

  return [
    ...sections,
    ...content.map((entry) => ({
      url: absoluteUrl(entry.path),
      lastModified: entry.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}

import { describe, expect, it } from "vitest";
import type { SiteDTO } from "@portfolio/shared";
import { jsonLdString, pageMetadata } from "@/lib/seo";

const site = {
  profile: { fullName: "Ibrahim All-Mamun" },
  settings: {
    siteName: "Ibrahim All-Mamun",
    siteDescription: "Data scientist.",
    defaultOgImage: null,
  },
  routeSeo: {
    projects: {
      title: "Work",
      description: "Case studies.",
      canonicalUrl: null,
      ogImage: null,
      noindex: false,
    },
  },
} as unknown as SiteDTO;

describe("pageMetadata", () => {
  it("prefers CMS overrides, then the page's own values, then site defaults", () => {
    const fromRoute = pageMetadata({
      site,
      title: "Projects",
      path: "/projects",
      routeKey: "projects",
    });
    expect(fromRoute.title).toEqual({ absolute: "Work — Ibrahim All-Mamun" });
    expect(fromRoute.description).toBe("Case studies.");

    const fromPage = pageMetadata({
      site,
      title: "About",
      description: "Background.",
      path: "/about",
    });
    expect(fromPage.title).toEqual({ absolute: "About — Ibrahim All-Mamun" });
    expect(fromPage.description).toBe("Background.");

    const home = pageMetadata({ site, path: "/" });
    expect(home.title).toEqual({ absolute: "Ibrahim All-Mamun" });
    expect(home.description).toBe("Data scientist.");
  });

  it("builds absolute canonical and social image URLs", () => {
    const metadata = pageMetadata({
      site,
      title: "A project",
      path: "/projects/a",
      ogPath: "/og/projects/a",
    });
    expect(String(metadata.alternates?.canonical)).toMatch(/^https?:\/\/[^/]+\/projects\/a$/);
    const images = metadata.openGraph?.images as { url: string }[];
    expect(images[0]?.url).toMatch(/\/og\/projects\/a$/);
  });

  it("marks noindex pages", () => {
    expect(
      pageMetadata({ site, title: "Filtered", path: "/projects", noindex: true }).robots,
    ).toEqual({ index: false, follow: true });
  });
});

describe("jsonLdString", () => {
  it("cannot close the script element it is embedded in", () => {
    const text = jsonLdString({ name: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("<");
    expect(JSON.parse(text)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});

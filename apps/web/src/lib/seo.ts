import type { Metadata } from "next";
import type { MediaDTO, SeoDTO, SiteDTO, StaticRouteKey } from "@portfolio/shared";
import { SITE_URL } from "./env";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

interface PageMetadataInput {
  site: SiteDTO | null;
  /** Page title without the site name (omit on the home page). */
  title?: string | null;
  description?: string | null;
  path: string;
  /** Explicit social image; otherwise the generated card at `ogPath` or the site default. */
  image?: MediaDTO | null;
  ogPath?: string | null;
  seo?: SeoDTO | null;
  routeKey?: StaticRouteKey;
  type?: "website" | "article" | "profile";
  publishedTime?: string | null;
  modifiedTime?: string | null;
  noindex?: boolean;
}

/**
 * Builds metadata with a clear precedence: explicit SEO overrides from the CMS,
 * then the page's own title/description, then site defaults.
 */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const routeSeo = input.routeKey ? input.site?.routeSeo[input.routeKey] : undefined;
  const seo = input.seo ?? routeSeo ?? null;
  const siteName = input.site?.settings.siteName ?? "Ibrahim All-Mamun";
  const title = seo?.title ?? input.title ?? null;
  const description = seo?.description ?? input.description ?? input.site?.settings.siteDescription ?? undefined;
  const canonical = seo?.canonicalUrl ?? absoluteUrl(input.path);
  const imageMedia = seo?.ogImage ?? input.image ?? null;
  const imageUrl = imageMedia
    ? absoluteUrl(imageMedia.url)
    : input.ogPath
      ? absoluteUrl(input.ogPath)
      : input.site?.settings.defaultOgImage
        ? absoluteUrl(input.site.settings.defaultOgImage.url)
        : absoluteUrl("/og/site/default");
  const images = [
    {
      url: imageUrl,
      width: imageMedia?.width ?? 1200,
      height: imageMedia?.height ?? 630,
      alt: imageMedia?.alt || title || siteName,
    },
  ];
  const fullTitle = title ? `${title} — ${siteName}` : siteName;
  return {
    title: title ? { absolute: fullTitle } : { absolute: siteName },
    description,
    alternates: { canonical },
    robots: seo?.noindex || input.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: input.type ?? "website",
      url: canonical,
      siteName,
      title: fullTitle,
      description,
      locale: "en_GB",
      images,
      ...(input.type === "article"
        ? {
            publishedTime: input.publishedTime ?? undefined,
            modifiedTime: input.modifiedTime ?? undefined,
            authors: input.site ? [input.site.profile.fullName] : undefined,
          }
        : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: images.map((image) => image.url) },
  };
}

/** Serialises JSON-LD safely for inline <script> (prevents `</script>` injection). */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function personSchema(site: SiteDTO) {
  const profile = site.profile;
  return {
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    name: profile.fullName,
    jobTitle: profile.headline,
    url: SITE_URL,
    email: profile.email ? `mailto:${profile.email}` : undefined,
    address: profile.location ? { "@type": "PostalAddress", addressLocality: profile.location } : undefined,
    image: profile.avatar ? absoluteUrl(profile.avatar.url) : undefined,
    sameAs: site.socialLinks.filter((link) => /^https?:/.test(link.url)).map((link) => link.url),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function graph(...nodes: unknown[]) {
  return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}

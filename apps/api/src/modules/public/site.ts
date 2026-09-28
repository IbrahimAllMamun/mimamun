import { and, asc, eq, isNotNull } from "drizzle-orm";
import {
  STATIC_ROUTE_KEYS,
  type ProfileDTO,
  type SeoDTO,
  type SiteDTO,
  type StaticRouteKey,
} from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import { media, navigationItems, profile, seoMetadata, siteSettings, socialLinks } from "../../database/schema";
import { isoRequired } from "../../lib/http";
import { loadMediaMap, mediaUrl, pick } from "../media/mapper";

export async function getProfile(db: DbExecutor): Promise<ProfileDTO | null> {
  const [row] = await db.select().from(profile).where(eq(profile.id, 1));
  if (!row) return null;
  const mediaMap = await loadMediaMap(db, [row.avatarMediaId]);
  let cv: ProfileDTO["cv"] = null;
  if (row.cvMediaId) {
    const [file] = await db.select().from(media).where(eq(media.id, row.cvMediaId));
    if (file) {
      cv = {
        url: mediaUrl(file.storageKey),
        downloadUrl: "/cv",
        fileName: file.originalName,
        sizeBytes: file.sizeBytes,
        updatedAt: isoRequired(file.updatedAt),
      };
    }
  }
  return {
    fullName: row.fullName,
    headline: row.headline,
    statement: row.statement,
    intro: row.intro,
    bio: row.bio,
    philosophy: row.philosophy,
    researchInterests: row.researchInterests,
    interests: row.interests,
    location: row.location,
    email: row.email,
    availability: row.availability,
    avatar: pick(mediaMap, row.avatarMediaId),
    cv,
    updatedAt: isoRequired(row.updatedAt),
  };
}

export function toSeoDTO(
  row: typeof seoMetadata.$inferSelect | null | undefined,
  mediaMap: Map<string, NonNullable<SeoDTO["ogImage"]>>,
): SeoDTO {
  return {
    title: row?.title ?? null,
    description: row?.description ?? null,
    canonicalUrl: row?.canonicalUrl ?? null,
    ogImage: pick(mediaMap, row?.ogImageId),
    noindex: row?.noindex ?? false,
  };
}

export async function loadSeoById(db: DbExecutor, seoId: string | null): Promise<SeoDTO> {
  if (!seoId) return toSeoDTO(null, new Map());
  const [row] = await db.select().from(seoMetadata).where(eq(seoMetadata.id, seoId));
  return toSeoDTO(row, await loadMediaMap(db, [row?.ogImageId]));
}

export async function getSite(db: DbExecutor): Promise<SiteDTO | null> {
  const [profileDTO, settingsRows, links, nav, seoRows] = await Promise.all([
    getProfile(db),
    db.select().from(siteSettings).where(eq(siteSettings.id, 1)),
    db.select().from(socialLinks).where(eq(socialLinks.isVisible, true)).orderBy(asc(socialLinks.displayOrder)),
    db
      .select()
      .from(navigationItems)
      .where(eq(navigationItems.isVisible, true))
      .orderBy(asc(navigationItems.location), asc(navigationItems.displayOrder)),
    db.select().from(seoMetadata).where(and(isNotNull(seoMetadata.routeKey))),
  ]);
  const settings = settingsRows[0];
  if (!profileDTO || !settings) return null;
  const mediaMap = await loadMediaMap(db, [settings.defaultOgImageId, ...seoRows.map((row) => row.ogImageId)]);
  const routeSeo: SiteDTO["routeSeo"] = {};
  for (const row of seoRows) {
    if (row.routeKey && (STATIC_ROUTE_KEYS as readonly string[]).includes(row.routeKey)) {
      routeSeo[row.routeKey as StaticRouteKey] = toSeoDTO(row, mediaMap);
    }
  }
  const toNav = (item: typeof navigationItems.$inferSelect) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    openInNewTab: item.openInNewTab,
  });
  return {
    profile: profileDTO,
    socialLinks: links.map((link) => ({
      id: link.id,
      platform: link.platform as SiteDTO["socialLinks"][number]["platform"],
      label: link.label,
      url: link.url,
      handle: link.handle,
    })),
    navigation: {
      header: nav.filter((item) => item.location === "header").map(toNav),
      footer: nav.filter((item) => item.location === "footer").map(toNav),
    },
    settings: {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      footerNote: settings.footerNote,
      contactFormEnabled: settings.contactFormEnabled,
      analyticsEnabled: settings.analyticsEnabled,
      defaultOgImage: pick(mediaMap, settings.defaultOgImageId),
    },
    routeSeo,
  };
}

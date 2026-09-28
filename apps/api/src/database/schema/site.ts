import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, smallint, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, updatedAt } from "./_helpers";
import { navLocationEnum } from "./enums";
import { media } from "./media";

/** Singleton row (id = 1) holding the owner's profile. */
export const profile = pgTable(
  "profile",
  {
    id: smallint().primaryKey().default(1),
    fullName: text().notNull(),
    headline: text().notNull(),
    statement: text(),
    intro: text(),
    bio: text(),
    philosophy: text(),
    researchInterests: text(),
    interests: text(),
    location: text(),
    email: text(),
    availability: text(),
    avatarMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    cvMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    updatedAt: updatedAt(),
  },
  (t) => [check("profile_singleton", sql`${t.id} = 1`)],
);

export const socialLinks = pgTable(
  "social_links",
  {
    id: id(),
    platform: text().notNull(),
    label: text().notNull(),
    url: text().notNull(),
    handle: text(),
    displayOrder: integer().notNull().default(0),
    isVisible: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [index("social_links_order_idx").on(t.displayOrder)],
);

/** "What I work on" entries on the home page. */
export const focusAreas = pgTable("focus_areas", {
  id: id(),
  title: text().notNull(),
  description: text().notNull(),
  evidence: text(),
  displayOrder: integer().notNull().default(0),
  isVisible: boolean().notNull().default(true),
  ...timestamps(),
});

/** The Statistics → Data → Modeling → Analytics → Research → Impact pipeline. */
export const approachSteps = pgTable("approach_steps", {
  id: id(),
  title: text().notNull(),
  description: text().notNull(),
  evidence: text(),
  displayOrder: integer().notNull().default(0),
  isVisible: boolean().notNull().default(true),
  ...timestamps(),
});

export const navigationItems = pgTable(
  "navigation_items",
  {
    id: id(),
    location: navLocationEnum().notNull().default("header"),
    label: text().notNull(),
    href: text().notNull(),
    openInNewTab: boolean().notNull().default(false),
    displayOrder: integer().notNull().default(0),
    isVisible: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [index("navigation_items_location_idx").on(t.location, t.displayOrder)],
);

/**
 * SEO overrides. Static pages use `route_key`; content rows point here via `seo_id`.
 */
export const seoMetadata = pgTable("seo_metadata", {
  id: id(),
  routeKey: text().unique(),
  title: text(),
  description: text(),
  canonicalUrl: text(),
  ogImageId: uuid().references(() => media.id, { onDelete: "restrict" }),
  noindex: boolean().notNull().default(false),
  ...timestamps(),
});

/** Singleton row (id = 1) of site-wide settings. */
export const siteSettings = pgTable(
  "site_settings",
  {
    id: smallint().primaryKey().default(1),
    siteName: text().notNull(),
    siteDescription: text().notNull(),
    defaultOgImageId: uuid().references(() => media.id, { onDelete: "restrict" }),
    footerNote: text(),
    contactFormEnabled: boolean().notNull().default(true),
    contactNotificationEmail: text(),
    analyticsEnabled: boolean().notNull().default(true),
    analyticsRetentionDays: integer().notNull().default(395),
    githubUsername: text(),
    githubSyncEnabled: boolean().notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("site_settings_singleton", sql`${t.id} = 1`),
    check("site_settings_retention_range", sql`${t.analyticsRetentionDays} BETWEEN 30 AND 1095`),
  ],
);

import { asc, eq } from "drizzle-orm";
import {
  approachStepInput,
  focusAreaInput,
  navigationItemInput,
  PERMISSIONS,
  SOCIAL_PLATFORM_LABELS,
  socialLinkInput,
  type SocialPlatform,
} from "@portfolio/shared";
import { approachSteps, focusAreas, navigationItems, socialLinks } from "../../database/schema";
import { defineResource, listItem } from "../../lib/resource";

export const socialLinkResource = defineResource({
  path: "social-links",
  entityType: "social_link",
  label: "Social link",
  table: socialLinks,
  input: socialLinkInput,
  searchColumns: ["label", "url", "handle"],
  defaultSort: [asc(socialLinks.displayOrder)],
  listItem: (row) =>
    listItem(row, {
      title: String(row.label),
      subtitle: String(row.url),
      extra: {
        platform: SOCIAL_PLATFORM_LABELS[row.platform as SocialPlatform] ?? String(row.platform),
      },
    }),
});

export const focusAreaResource = defineResource({
  path: "focus-areas",
  entityType: "focus_area",
  label: "Focus area",
  table: focusAreas,
  input: focusAreaInput,
  searchColumns: ["title", "description"],
  defaultSort: [asc(focusAreas.displayOrder)],
  listItem: (row) =>
    listItem(row, { title: String(row.title), subtitle: (row.evidence as string | null) ?? null }),
});

export const approachStepResource = defineResource({
  path: "approach-steps",
  entityType: "approach_step",
  label: "Approach step",
  table: approachSteps,
  input: approachStepInput,
  searchColumns: ["title", "description"],
  defaultSort: [asc(approachSteps.displayOrder)],
  listItem: (row) => listItem(row, { title: String(row.title), subtitle: String(row.description) }),
});

export const navigationResource = defineResource({
  path: "navigation",
  entityType: "navigation_item",
  label: "Navigation item",
  table: navigationItems,
  input: navigationItemInput,
  permissions: {
    read: PERMISSIONS.SETTINGS_MANAGE,
    write: PERMISSIONS.SETTINGS_MANAGE,
    remove: PERMISSIONS.SETTINGS_MANAGE,
    publish: PERMISSIONS.SETTINGS_MANAGE,
  },
  searchColumns: ["label", "href"],
  defaultSort: [asc(navigationItems.location), asc(navigationItems.displayOrder)],
  filters: (query) =>
    query.type === "header" || query.type === "footer"
      ? [eq(navigationItems.location, query.type)]
      : [],
  listItem: (row) =>
    listItem(row, {
      title: String(row.label),
      subtitle: String(row.href),
      extra: { location: String(row.location) },
    }),
});

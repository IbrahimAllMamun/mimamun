import { z } from "zod";
import { NAV_LOCATIONS, SOCIAL_PLATFORMS } from "../enums";
import {
  displayOrder,
  emptyToNull,
  linkHref,
  nullableEmail,
  nullableText,
  nullableUrl,
  requiredText,
  uuid,
} from "./common";

const nullableId = z.preprocess(emptyToNull, uuid.nullable());

export const profileInput = z.object({
  fullName: requiredText(120, "Full name"),
  headline: requiredText(120, "Professional title"),
  statement: nullableText(300, "Statement"),
  intro: nullableText(2000, "Introduction"),
  bio: nullableText(12_000, "Biography"),
  philosophy: nullableText(6000, "Working philosophy"),
  researchInterests: nullableText(4000, "Research interests"),
  interests: nullableText(4000, "Professional interests"),
  location: nullableText(160, "Location"),
  email: nullableEmail,
  availability: nullableText(200, "Availability"),
  avatarMediaId: nullableId,
  cvMediaId: nullableId,
});
export type ProfileInput = z.infer<typeof profileInput>;

export const socialLinkInput = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  label: requiredText(60, "Label"),
  url: linkHref,
  handle: nullableText(100, "Handle"),
  displayOrder,
  isVisible: z.boolean().default(true),
});
export type SocialLinkInput = z.infer<typeof socialLinkInput>;

export const focusAreaInput = z.object({
  title: requiredText(120, "Title"),
  description: requiredText(600, "Description"),
  evidence: nullableText(300, "Evidence"),
  displayOrder,
  isVisible: z.boolean().default(true),
});
export type FocusAreaInput = z.infer<typeof focusAreaInput>;

export const approachStepInput = z.object({
  title: requiredText(80, "Title"),
  description: requiredText(400, "Description"),
  evidence: nullableText(300, "Evidence"),
  displayOrder,
  isVisible: z.boolean().default(true),
});
export type ApproachStepInput = z.infer<typeof approachStepInput>;

export const navigationItemInput = z.object({
  location: z.enum(NAV_LOCATIONS).default("header"),
  label: requiredText(40, "Label"),
  href: linkHref,
  openInNewTab: z.boolean().default(false),
  displayOrder,
  isVisible: z.boolean().default(true),
});
export type NavigationItemInput = z.infer<typeof navigationItemInput>;

export const seoFieldsInput = z.object({
  title: nullableText(120, "SEO title"),
  description: nullableText(300, "SEO description"),
  canonicalUrl: nullableUrl,
  ogImageId: nullableId,
  noindex: z.boolean().default(false),
});
export type SeoFieldsInput = z.infer<typeof seoFieldsInput>;

export const EMPTY_SEO: SeoFieldsInput = {
  title: null,
  description: null,
  canonicalUrl: null,
  ogImageId: null,
  noindex: false,
};

export const STATIC_ROUTE_KEYS = [
  "home",
  "about",
  "experience",
  "projects",
  "research",
  "publications",
  "certifications",
  "blog",
  "contact",
  "search",
] as const;
export type StaticRouteKey = (typeof STATIC_ROUTE_KEYS)[number];

export const siteSettingsInput = z.object({
  siteName: requiredText(120, "Site name"),
  siteDescription: requiredText(300, "Site description"),
  defaultOgImageId: nullableId,
  footerNote: nullableText(300, "Footer note"),
  contactFormEnabled: z.boolean().default(true),
  contactNotificationEmail: nullableEmail,
  analyticsEnabled: z.boolean().default(true),
  analyticsRetentionDays: z.coerce.number().int().min(30).max(1095).default(395),
  githubUsername: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, { error: "Enter a valid GitHub username" })
      .nullable(),
  ),
  githubSyncEnabled: z.boolean().default(false),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsInput>;

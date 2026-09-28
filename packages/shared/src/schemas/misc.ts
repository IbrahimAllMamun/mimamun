import { z } from "zod";
import { ANALYTICS_EVENT_TYPES, CONTACT_STATUSES, ENTITY_TYPES, MEDIA_KINDS } from "../enums";
import { email, emptyToNull, nullableText, requiredText, uuid } from "./common";

// ── Contact ───────────────────────────────────────────────────────────────

export const contactInput = z.object({
  name: requiredText(120, "Name"),
  email: z.string().trim().toLowerCase().pipe(email),
  subject: requiredText(160, "Subject"),
  message: z
    .string({ error: "Message is required" })
    .trim()
    .min(20, { error: "Please write at least 20 characters" })
    .max(5000, { error: "Please keep the message under 5,000 characters" }),
  /** Signed timestamp issued with the form; rejects instant bot submissions. */
  token: z.string().max(512).default(""),
  /** Honeypot: hidden from people, filled in by bots. Must stay empty. */
  website: z.string().max(500).default(""),
});
export type ContactInput = z.infer<typeof contactInput>;

export const contactUpdateInput = z.object({
  status: z.enum(CONTACT_STATUSES),
});

export const contactListQuery = z.object({
  q: z.preprocess(emptyToNull, z.string().max(200).nullable()).optional(),
  status: z.preprocess(emptyToNull, z.enum(CONTACT_STATUSES).nullable()).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const contactBulkInput = z.object({
  ids: z.array(uuid).min(1).max(200),
  action: z.enum(["read", "archive", "spam", "delete"]),
});

// ── Analytics ─────────────────────────────────────────────────────────────

export const analyticsEventInput = z.object({
  type: z.enum(ANALYTICS_EVENT_TYPES),
  path: z
    .string()
    .max(512)
    .refine((value) => value.startsWith("/") && !value.startsWith("//"), { error: "Invalid path" }),
  referrer: z.preprocess(emptyToNull, z.string().max(2048).nullable()).optional(),
  target: z.preprocess(emptyToNull, z.string().max(2048).nullable()).optional(),
  entityType: z.preprocess(emptyToNull, z.enum(ENTITY_TYPES).nullable()).optional(),
  entitySlug: z.preprocess(emptyToNull, z.string().max(160).nullable()).optional(),
});
export type AnalyticsEventInput = z.infer<typeof analyticsEventInput>;

export const analyticsSummaryQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

// ── Media ─────────────────────────────────────────────────────────────────

export const mediaUpdateInput = z.object({
  title: nullableText(200, "Title"),
  altText: nullableText(300, "Alt text"),
  caption: nullableText(500, "Caption"),
});
export type MediaUpdateInput = z.infer<typeof mediaUpdateInput>;

export const mediaListQuery = z.object({
  q: z.preprocess(emptyToNull, z.string().max(200).nullable()).optional(),
  kind: z.preprocess(emptyToNull, z.enum(MEDIA_KINDS).nullable()).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

// ── Integrations ──────────────────────────────────────────────────────────

export const githubRepositoryUpdateInput = z.object({
  isSelected: z.boolean(),
  displayOrder: z.coerce.number().int().min(0).max(100_000).default(0),
  customDescription: nullableText(300, "Description"),
  projectId: z.preprocess(emptyToNull, uuid.nullable()),
});
export type GithubRepositoryUpdateInput = z.infer<typeof githubRepositoryUpdateInput>;

// ── Audit log ─────────────────────────────────────────────────────────────

export const auditListQuery = z.object({
  q: z.preprocess(emptyToNull, z.string().max(200).nullable()).optional(),
  entityType: z.preprocess(emptyToNull, z.string().max(60).nullable()).optional(),
  userId: z.preprocess(emptyToNull, uuid.nullable()).optional(),
  action: z.preprocess(emptyToNull, z.string().max(80).nullable()).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const searchQueryInput = z.object({
  q: requiredText(120, "Search"),
});

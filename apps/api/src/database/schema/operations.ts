import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, timestamps, timestamptz } from "./_helpers";
import { analyticsEventTypeEnum, contactStatusEnum, deviceCategoryEnum } from "./enums";
import { projects } from "./projects";

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: id(),
    name: text().notNull(),
    email: text().notNull(),
    subject: text().notNull(),
    message: text().notNull(),
    status: contactStatusEnum().notNull().default("new"),
    /** HMAC of the sender IP with a server secret: supports abuse handling without storing IPs. */
    ipHash: text(),
    notifiedAt: timestamptz(),
    readAt: timestamptz(),
    repliedAt: timestamptz(),
    ...timestamps(),
  },
  (t) => [
    index("contact_messages_status_idx").on(t.status, t.createdAt.desc()),
    index("contact_messages_created_idx").on(t.createdAt.desc()),
  ],
);

/**
 * Privacy-preserving analytics. No IP addresses, no cookies, no full user agents.
 * `visitor_hash` = SHA-256(daily salt + IP + UA); salts are deleted after two days.
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamptz().notNull().defaultNow(),
    type: analyticsEventTypeEnum().notNull(),
    path: text().notNull(),
    entityType: text(),
    entitySlug: text(),
    referrerHost: text(),
    target: text(),
    device: deviceCategoryEnum(),
    browser: text(),
    os: text(),
    country: char({ length: 2 }),
    visitorHash: text(),
  },
  (t) => [
    index("analytics_events_occurred_idx").on(t.occurredAt),
    index("analytics_events_type_idx").on(t.type, t.occurredAt),
    index("analytics_events_entity_idx").on(t.entityType, t.entitySlug),
  ],
);

export const analyticsSalts = pgTable("analytics_salts", {
  day: date({ mode: "string" }).primaryKey(),
  salt: text().notNull(),
  createdAt: createdAt(),
});

/** Cached GitHub repository metadata with manual curation. */
export const githubRepositories = pgTable(
  "github_repositories",
  {
    id: id(),
    githubId: bigint({ mode: "number" }).notNull().unique(),
    owner: text().notNull(),
    name: text().notNull(),
    fullName: text().notNull(),
    description: text(),
    htmlUrl: text().notNull(),
    homepage: text(),
    primaryLanguage: text(),
    languages: jsonb()
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    topics: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    stars: integer().notNull().default(0),
    forks: integer().notNull().default(0),
    isFork: boolean().notNull().default(false),
    isArchived: boolean().notNull().default(false),
    pushedAt: timestamptz(),
    isSelected: boolean().notNull().default(false),
    displayOrder: integer().notNull().default(0),
    customDescription: text(),
    projectId: uuid().references(() => projects.id, { onDelete: "set null" }),
    lastSyncedAt: timestamptz(),
    ...timestamps(),
  },
  (t) => [
    index("github_repositories_selected_idx").on(t.isSelected, t.displayOrder),
    check("github_repositories_counts", sql`${t.stars} >= 0 AND ${t.forks} >= 0`),
  ],
);

export const integrationStatus = pgTable("integration_status", {
  key: text().primaryKey(),
  lastRunAt: timestamptz(),
  lastSuccessAt: timestamptz(),
  lastErrorAt: timestamptz(),
  lastError: text(),
  meta: jsonb()
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  updatedAt: timestamptz().notNull().defaultNow(),
});

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { id, SLUG_CHECK, timestamps } from "./_helpers";
import { media } from "./media";
import { projects } from "./projects";
import { credentialTypes } from "./taxonomy";

/** Issuing organisations — data, not code (Coursera, DataCamp, IEEE-CS SBC DU, …). */
export const credentialProviders = pgTable(
  "credential_providers",
  {
    id: id(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    websiteUrl: text(),
    logoMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    description: text(),
    displayOrder: integer().notNull().default(0),
    isVisible: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    check("credential_providers_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`),
  ],
);

/**
 * Credential hierarchy as an adjacency list:
 * provider → program/specialization/track → course/module → certificate.
 * Any node may itself be a credential (issue date, ID, verification).
 * The composite foreign key (parent_id, provider_id) → (id, provider_id)
 * guarantees that a child always belongs to its parent's provider; moving a
 * parent to another provider cascades to its subtree.
 */
export const credentials = pgTable(
  "credentials",
  {
    id: id(),
    providerId: uuid()
      .notNull()
      .references(() => credentialProviders.id, { onDelete: "restrict" }),
    parentId: uuid(),
    typeId: uuid()
      .notNull()
      .references(() => credentialTypes.id, { onDelete: "restrict" }),
    title: text().notNull(),
    slug: text().notNull().unique(),
    level: text(),
    description: text(),
    issuedOn: date({ mode: "string" }),
    expiresOn: date({ mode: "string" }),
    credentialCode: text(),
    credentialUrl: text(),
    verificationUrl: text(),
    imageMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    pdfMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    relatedProjectId: uuid().references(() => projects.id, { onDelete: "set null" }),
    featured: boolean().notNull().default(false),
    displayOrder: integer().notNull().default(0),
    isVisible: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    unique("credentials_id_provider_unique").on(t.id, t.providerId),
    foreignKey({
      columns: [t.parentId, t.providerId],
      foreignColumns: [t.id, t.providerId],
      name: "credentials_parent_same_provider_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    check("credentials_not_own_parent", sql`${t.parentId} IS NULL OR ${t.parentId} <> ${t.id}`),
    check(
      "credentials_expiry_after_issue",
      sql`${t.expiresOn} IS NULL OR ${t.issuedOn} IS NULL OR ${t.expiresOn} >= ${t.issuedOn}`,
    ),
    check("credentials_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`),
    index("credentials_provider_idx").on(t.providerId, t.parentId, t.displayOrder),
    index("credentials_parent_idx").on(t.parentId),
  ],
);

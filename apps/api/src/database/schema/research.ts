import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import type { ResearchSections } from "@portfolio/shared";
import { id, SLUG_CHECK, timestamps, timestamptz, tsvector } from "./_helpers";
import { users } from "./auth";
import { education } from "./career";
import {
  contentStatusEnum,
  presentationTypeEnum,
  publicationStatusEnum,
  publicationTypeEnum,
  researchKindEnum,
  visibilityEnum,
} from "./enums";
import { media } from "./media";
import { seoMetadata } from "./site";

export const research = pgTable(
  "research",
  {
    id: id(),
    title: text().notNull(),
    slug: text().notNull().unique(),
    kind: researchKindEnum().notNull().default("research_project"),
    summary: text().notNull(),
    abstract: text(),
    researchQuestion: text(),
    sections: jsonb()
      .$type<Partial<ResearchSections>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    keywords: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    methods: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    authors: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    degree: text(),
    institution: text(),
    supervisor: text(),
    educationId: uuid().references(() => education.id, { onDelete: "set null" }),
    startedOn: date({ mode: "string" }),
    completedOn: date({ mode: "string" }),
    pdfMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    posterMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    slidesMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    coverMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    externalUrl: text(),
    status: contentStatusEnum().notNull().default("draft"),
    visibility: visibilityEnum().notNull().default("public"),
    featured: boolean().notNull().default(false),
    displayOrder: integer().notNull().default(0),
    publishedAt: timestamptz(),
    seoId: uuid().references(() => seoMetadata.id, { onDelete: "set null" }),
    searchText: text().notNull().default(""),
    searchVector: tsvector().generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(summary, '')), 'B') || setweight(to_tsvector('english', coalesce(abstract, '') || ' ' || coalesce(search_text, '')), 'C')`,
    ),
    createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    check("research_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`),
    check(
      "research_period_order",
      sql`${t.completedOn} IS NULL OR ${t.startedOn} IS NULL OR ${t.completedOn} >= ${t.startedOn}`,
    ),
    check(
      "research_published_has_date",
      sql`${t.status} <> 'published' OR ${t.publishedAt} IS NOT NULL`,
    ),
    index("research_public_idx").on(t.status, t.visibility, t.featured, t.displayOrder),
    index("research_education_idx").on(t.educationId),
    index("research_search_idx").using("gin", t.searchVector),
  ],
);

export const publications = pgTable(
  "publications",
  {
    id: id(),
    title: text().notNull(),
    slug: text().notNull().unique(),
    authors: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    publicationType: publicationTypeEnum().notNull().default("journal_article"),
    publicationStatus: publicationStatusEnum().notNull().default("published"),
    venue: text(),
    volume: text(),
    issue: text(),
    pages: text(),
    publisher: text(),
    publishedOn: date({ mode: "string" }),
    doi: text(),
    url: text(),
    pdfMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    abstract: text(),
    keywords: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    methodology: text(),
    findings: text(),
    citationText: text(),
    bibtex: text(),
    researchId: uuid().references(() => research.id, { onDelete: "set null" }),
    status: contentStatusEnum().notNull().default("draft"),
    visibility: visibilityEnum().notNull().default("public"),
    featured: boolean().notNull().default(false),
    displayOrder: integer().notNull().default(0),
    publishedAt: timestamptz(),
    seoId: uuid().references(() => seoMetadata.id, { onDelete: "set null" }),
    searchText: text().notNull().default(""),
    searchVector: tsvector().generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(abstract, '')), 'B') || setweight(to_tsvector('english', coalesce(search_text, '')), 'C')`,
    ),
    ...timestamps(),
  },
  (t) => [
    check("publications_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`),
    check(
      "publications_published_has_date",
      sql`${t.status} <> 'published' OR ${t.publishedAt} IS NOT NULL`,
    ),
    index("publications_public_idx").on(t.status, t.visibility, t.publishedOn),
    index("publications_research_idx").on(t.researchId),
    index("publications_doi_idx").on(t.doi),
    index("publications_search_idx").using("gin", t.searchVector),
  ],
);

export const conferencePresentations = pgTable(
  "conference_presentations",
  {
    id: id(),
    title: text().notNull(),
    conferenceName: text().notNull(),
    conferenceShortName: text(),
    edition: text(),
    location: text(),
    presentedOn: date({ mode: "string" }),
    presentationType: presentationTypeEnum().notNull().default("poster"),
    abstract: text(),
    posterMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    slidesMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    eventUrl: text(),
    researchId: uuid().references(() => research.id, { onDelete: "set null" }),
    status: contentStatusEnum().notNull().default("draft"),
    visibility: visibilityEnum().notNull().default("public"),
    featured: boolean().notNull().default(false),
    displayOrder: integer().notNull().default(0),
    publishedAt: timestamptz(),
    ...timestamps(),
  },
  (t) => [
    check(
      "conference_presentations_published_has_date",
      sql`${t.status} <> 'published' OR ${t.publishedAt} IS NOT NULL`,
    ),
    index("conference_presentations_public_idx").on(t.status, t.presentedOn),
    index("conference_presentations_research_idx").on(t.researchId),
  ],
);

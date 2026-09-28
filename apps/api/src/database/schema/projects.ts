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
import type { ProjectSections } from "@portfolio/shared";
import { id, SLUG_CHECK, timestamps, timestamptz, tsvector } from "./_helpers";
import { users } from "./auth";
import {
  contentStatusEnum,
  projectMediaKindEnum,
  projectTypeEnum,
  visibilityEnum,
} from "./enums";
import { media } from "./media";
import { seoMetadata } from "./site";
import { projectCategories } from "./taxonomy";

export const projects = pgTable(
  "projects",
  {
    id: id(),
    title: text().notNull(),
    slug: text().notNull().unique(),
    summary: text().notNull(),
    type: projectTypeEnum().notNull().default("professional"),
    categoryId: uuid().references(() => projectCategories.id, { onDelete: "set null" }),
    role: text(),
    organization: text(),
    startedOn: date({ mode: "string" }),
    completedOn: date({ mode: "string" }),
    technologies: text().array().notNull().default(sql`'{}'::text[]`),
    githubUrl: text(),
    demoUrl: text(),
    docsUrl: text(),
    coverMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    /** Case-study sections → content blocks. Validated by @portfolio/shared on write. */
    sections: jsonb().$type<Partial<ProjectSections>>().notNull().default(sql`'{}'::jsonb`),
    status: contentStatusEnum().notNull().default("draft"),
    visibility: visibilityEnum().notNull().default("public"),
    featured: boolean().notNull().default(false),
    displayOrder: integer().notNull().default(0),
    publishedAt: timestamptz(),
    seoId: uuid().references(() => seoMetadata.id, { onDelete: "set null" }),
    /** Plain text of sections, technologies and tags; maintained by the API for search. */
    searchText: text().notNull().default(""),
    searchVector: tsvector().generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(summary, '')), 'B') || setweight(to_tsvector('english', coalesce(search_text, '')), 'C')`,
    ),
    createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    check("projects_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`),
    check(
      "projects_period_order",
      sql`${t.completedOn} IS NULL OR ${t.startedOn} IS NULL OR ${t.completedOn} >= ${t.startedOn}`,
    ),
    check(
      "projects_published_has_date",
      sql`${t.status} <> 'published' OR ${t.publishedAt} IS NOT NULL`,
    ),
    index("projects_public_idx").on(t.status, t.visibility, t.featured, t.displayOrder),
    index("projects_category_idx").on(t.categoryId),
    index("projects_technologies_idx").using("gin", t.technologies),
    index("projects_search_idx").using("gin", t.searchVector),
  ],
);

export const projectMedia = pgTable(
  "project_media",
  {
    id: id(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    mediaId: uuid()
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    kind: projectMediaKindEnum().notNull().default("gallery"),
    caption: text(),
    displayOrder: integer().notNull().default(0),
  },
  (t) => [index("project_media_project_idx").on(t.projectId, t.displayOrder)],
);

export const projectMetrics = pgTable(
  "project_metrics",
  {
    id: id(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    label: text().notNull(),
    value: text().notNull(),
    unit: text(),
    context: text(),
    displayOrder: integer().notNull().default(0),
  },
  (t) => [index("project_metrics_project_idx").on(t.projectId, t.displayOrder)],
);

import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, SLUG_CHECK, timestamps } from "./_helpers";

export const projectCategories = pgTable(
  "project_categories",
  {
    id: id(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    description: text(),
    displayOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [check("project_categories_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`)],
);

/** Shared tag vocabulary for projects and blog posts. */
export const tags = pgTable(
  "tags",
  {
    id: id(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [check("tags_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`)],
);

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: id(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    description: text(),
    displayOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [check("blog_categories_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`)],
);

/** Admin-defined credential node types (Specialization, Track, Course, Certificate, …). */
export const credentialTypes = pgTable(
  "credential_types",
  {
    id: id(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    description: text(),
    displayOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [check("credential_types_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`)],
);

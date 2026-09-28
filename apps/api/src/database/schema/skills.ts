import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { id, SLUG_CHECK, timestamps } from "./_helpers";
import { skillLevelEnum } from "./enums";

/** Arbitrarily nested skill groups (adjacency list). */
export const skillCategories = pgTable(
  "skill_categories",
  {
    id: id(),
    parentId: uuid(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    description: text(),
    displayOrder: integer().notNull().default(0),
    isVisible: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      columns: [t.parentId],
      foreignColumns: [t.id],
      name: "skill_categories_parent_fk",
    }).onDelete("restrict"),
    check("skill_categories_not_own_parent", sql`${t.parentId} IS NULL OR ${t.parentId} <> ${t.id}`),
    check("skill_categories_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`),
    index("skill_categories_parent_idx").on(t.parentId, t.displayOrder),
  ],
);

export const skills = pgTable(
  "skills",
  {
    id: id(),
    categoryId: uuid()
      .notNull()
      .references(() => skillCategories.id, { onDelete: "restrict" }),
    name: text().notNull(),
    slug: text().notNull(),
    description: text(),
    /** Qualitative level; null means "not stated". Never shown as a percentage. */
    level: skillLevelEnum(),
    years: numeric({ precision: 4, scale: 1, mode: "number" }),
    icon: text(),
    technologies: text().array().notNull().default(sql`'{}'::text[]`),
    featured: boolean().notNull().default(false),
    displayOrder: integer().notNull().default(0),
    isVisible: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    unique("skills_category_slug_unique").on(t.categoryId, t.slug),
    check("skills_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`),
    check("skills_years_range", sql`${t.years} IS NULL OR (${t.years} >= 0 AND ${t.years} <= 60)`),
    index("skills_category_idx").on(t.categoryId, t.displayOrder),
  ],
);

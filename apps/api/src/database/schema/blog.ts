import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import type { Block } from "@portfolio/shared";
import { id, SLUG_CHECK, timestamps, timestamptz, tsvector } from "./_helpers";
import { users } from "./auth";
import { contentStatusEnum, visibilityEnum } from "./enums";
import { media } from "./media";
import { seoMetadata } from "./site";

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: id(),
    title: text().notNull(),
    slug: text().notNull().unique(),
    excerpt: text(),
    coverMediaId: uuid().references(() => media.id, { onDelete: "restrict" }),
    body: jsonb()
      .$type<Block[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    authorId: uuid().references(() => users.id, { onDelete: "set null" }),
    status: contentStatusEnum().notNull().default("draft"),
    visibility: visibilityEnum().notNull().default("public"),
    featured: boolean().notNull().default(false),
    displayOrder: integer().notNull().default(0),
    publishedAt: timestamptz(),
    readingTimeMinutes: integer().notNull().default(1),
    seoId: uuid().references(() => seoMetadata.id, { onDelete: "set null" }),
    searchText: text().notNull().default(""),
    searchVector: tsvector().generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') || setweight(to_tsvector('english', coalesce(search_text, '')), 'C')`,
    ),
    createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    check("blog_posts_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_CHECK}'`)}`),
    check(
      "blog_posts_published_has_date",
      sql`${t.status} <> 'published' OR ${t.publishedAt} IS NOT NULL`,
    ),
    index("blog_posts_public_idx").on(t.status, t.visibility, t.publishedAt.desc()),
    index("blog_posts_search_idx").using("gin", t.searchVector),
  ],
);

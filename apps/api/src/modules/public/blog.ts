import { and, asc, desc, eq, gt, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import {
  collectBlockMediaIds,
  type BlogPostDetailDTO,
  type BlogPostSummaryDTO,
  type PublicBlogQuery,
} from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import {
  blogCategories,
  blogPostCategories,
  blogPostProjects,
  blogPostResearch,
  blogPosts,
  blogPostTags,
  profile,
  projects,
  research,
  tags,
} from "../../database/schema";
import { iso, isoRequired } from "../../lib/http";
import { loadMediaMap, mediaRecord, pick } from "../media/mapper";
import { projectLink } from "./projects";
import { loadSeoById } from "./site";
import { listed, viewable, viewableUnless } from "./visibility";

type PostRow = typeof blogPosts.$inferSelect;

export async function toPostSummaries(
  db: DbExecutor,
  rows: PostRow[],
): Promise<BlogPostSummaryDTO[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [categoryRows, tagRows, mediaMap] = await Promise.all([
    db
      .select({
        postId: blogPostCategories.postId,
        name: blogCategories.name,
        slug: blogCategories.slug,
      })
      .from(blogPostCategories)
      .innerJoin(blogCategories, eq(blogCategories.id, blogPostCategories.categoryId))
      .where(inArray(blogPostCategories.postId, ids))
      .orderBy(asc(blogPostCategories.displayOrder)),
    db
      .select({ postId: blogPostTags.postId, name: tags.name, slug: tags.slug })
      .from(blogPostTags)
      .innerJoin(tags, eq(tags.id, blogPostTags.tagId))
      .where(inArray(blogPostTags.postId, ids)),
    loadMediaMap(
      db,
      rows.map((row) => row.coverMediaId),
    ),
  ]);
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover: pick(mediaMap, row.coverMediaId),
    publishedAt: iso(row.publishedAt),
    readingTimeMinutes: row.readingTimeMinutes,
    categories: categoryRows
      .filter((item) => item.postId === row.id)
      .map(({ name, slug }) => ({ name, slug })),
    tags: tagRows
      .filter((item) => item.postId === row.id)
      .map(({ name, slug }) => ({ name, slug })),
    featured: row.featured,
  }));
}

export async function listPublicPosts(db: DbExecutor, query: PublicBlogQuery) {
  const filters: SQL[] = [listed(blogPosts)];
  if (query.q) {
    const search = or(
      sql`${blogPosts.searchVector} @@ websearch_to_tsquery('english', ${query.q})`,
      sql`${blogPosts.title} ILIKE ${`%${query.q.replace(/[%_\\]/g, "\\$&")}%`}`,
    );
    if (search) filters.push(search);
  }
  if (query.category) {
    filters.push(sql`${blogPosts.id} IN (
      SELECT ${blogPostCategories.postId} FROM ${blogPostCategories}
      JOIN ${blogCategories} ON ${blogCategories.id} = ${blogPostCategories.categoryId}
      WHERE ${blogCategories.slug} = ${query.category})`);
  }
  if (query.tag) {
    filters.push(sql`${blogPosts.id} IN (
      SELECT ${blogPostTags.postId} FROM ${blogPostTags}
      JOIN ${tags} ON ${tags.id} = ${blogPostTags.tagId}
      WHERE ${tags.slug} = ${query.tag})`);
  }
  const where = and(...filters);
  const [rows, [countRow], categoryRows] = await Promise.all([
    db
      .select()
      .from(blogPosts)
      .where(where)
      .orderBy(desc(blogPosts.publishedAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(blogPosts)
      .where(where),
    db
      .select({
        name: blogCategories.name,
        slug: blogCategories.slug,
        count: sql<number>`count(*)::int`,
      })
      .from(blogCategories)
      .innerJoin(blogPostCategories, eq(blogPostCategories.categoryId, blogCategories.id))
      .innerJoin(blogPosts, and(eq(blogPosts.id, blogPostCategories.postId), listed(blogPosts)))
      .groupBy(blogCategories.id)
      .orderBy(asc(blogCategories.displayOrder)),
  ]);
  return {
    items: await toPostSummaries(db, rows),
    total: countRow?.value ?? 0,
    categories: categoryRows,
  };
}

export async function getPostDetail(
  db: DbExecutor,
  key: { slug?: string; id?: string },
  preview = false,
): Promise<BlogPostDetailDTO | null> {
  const identity = key.id ? eq(blogPosts.id, key.id) : eq(blogPosts.slug, key.slug ?? "");
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(and(identity, viewableUnless(preview, blogPosts)));
  if (!row) return null;
  const blockMediaIds = collectBlockMediaIds(row.body);
  const publishedAt = row.publishedAt ?? new Date();
  const [[summary], mediaMap, projectRows, researchRows, [previous], [next], [owner]] =
    await Promise.all([
      toPostSummaries(db, [row]),
      loadMediaMap(db, blockMediaIds),
      db
        .select({ slug: projects.slug, title: projects.title, type: projects.type })
        .from(blogPostProjects)
        .innerJoin(projects, eq(projects.id, blogPostProjects.projectId))
        .where(and(eq(blogPostProjects.postId, row.id), viewable(projects))),
      db
        .select({ slug: research.slug, title: research.title, kind: research.kind })
        .from(blogPostResearch)
        .innerJoin(research, eq(research.id, blogPostResearch.researchId))
        .where(and(eq(blogPostResearch.postId, row.id), viewable(research))),
      db
        .select({ slug: blogPosts.slug, title: blogPosts.title })
        .from(blogPosts)
        .where(and(listed(blogPosts), lt(blogPosts.publishedAt, publishedAt)))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(1),
      db
        .select({ slug: blogPosts.slug, title: blogPosts.title })
        .from(blogPosts)
        .where(and(listed(blogPosts), gt(blogPosts.publishedAt, publishedAt)))
        .orderBy(asc(blogPosts.publishedAt))
        .limit(1),
      db.select({ name: profile.fullName }).from(profile),
    ]);
  return {
    ...(summary as BlogPostSummaryDTO),
    body: row.body,
    media: mediaRecord(mediaMap, blockMediaIds),
    author: owner?.name ?? null,
    relatedProjects: projectRows.map(projectLink),
    relatedResearch: researchRows,
    previous: previous ?? null,
    next: next ?? null,
    seo: await loadSeoById(db, row.seoId),
    status: row.status,
    updatedAt: isoRequired(row.updatedAt),
  };
}

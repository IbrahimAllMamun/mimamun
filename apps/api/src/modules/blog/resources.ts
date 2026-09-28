import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  blocksToPlainText,
  blogPostInput,
  categoryInput,
  readingTimeMinutes,
  type BlogPostInput,
} from "@portfolio/shared";
import {
  blogCategories,
  blogPostCategories,
  blogPostProjects,
  blogPostResearch,
  blogPosts,
  blogPostTags,
  tags,
} from "../../database/schema";
import { loadLinks, syncLinks } from "../../lib/content";
import { assertMediaExists, blockMediaReferences } from "../../lib/media-refs";
import { defineResource, listItem } from "../../lib/resource";
import { buildSearchText } from "../../lib/search-text";
import { ensureTags } from "../projects/resources";

export const blogCategoryResource = defineResource({
  path: "blog-categories",
  entityType: "blog_category",
  label: "Blog category",
  table: blogCategories,
  input: categoryInput,
  slugSource: "name",
  searchColumns: ["name"],
  defaultSort: [asc(blogCategories.displayOrder), asc(blogCategories.name)],
  listItem: (row) =>
    listItem(row, {
      title: String(row.name),
      subtitle: (row.description as string | null) ?? null,
    }),
});

export const blogPostResource = defineResource<BlogPostInput>({
  path: "blog-posts",
  entityType: "blog_post",
  label: "Post",
  table: blogPosts,
  input: blogPostInput,
  slugSource: "title",
  seo: true,
  searchColumns: ["title", "excerpt"],
  defaultSort: [sql`${blogPosts.publishedAt} DESC NULLS FIRST`, desc(blogPosts.updatedAt)],
  sorts: { title: [asc(blogPosts.title)] },
  relationKeys: ["categoryIds", "tags", "projectIds", "researchIds"],
  listItem: (row) =>
    listItem(row, {
      title: String(row.title),
      subtitle: (row.excerpt as string | null) ?? null,
      extra: { readingTime: Number(row.readingTimeMinutes ?? 1) },
    }),
  derived: (input, { userId, existing }) => {
    const text = blocksToPlainText(input.body);
    return {
      readingTimeMinutes: readingTimeMinutes(text),
      searchText: buildSearchText({ blocks: input.body, lists: [input.tags] }),
      authorId: (existing?.authorId as string | null | undefined) ?? userId,
    };
  },
  loadRelations: async (db, ids) => {
    // Sequential on purpose: `db` may be a transaction, which runs one query at a time.
    const categories = await loadLinks(db, blogPostCategories, "postId", ids, "categoryId");
    const projects = await loadLinks(db, blogPostProjects, "postId", ids, "projectId");
    const research = await loadLinks(db, blogPostResearch, "postId", ids, "researchId");
    const tagRows = await db
      .select({ postId: blogPostTags.postId, name: tags.name })
      .from(blogPostTags)
      .innerJoin(tags, eq(tags.id, blogPostTags.tagId))
      .where(inArray(blogPostTags.postId, ids));
    return new Map(
      ids.map((id) => [
        id,
        {
          categoryIds: categories.get(id) ?? [],
          projectIds: projects.get(id) ?? [],
          researchIds: research.get(id) ?? [],
          tags: tagRows.filter((row) => row.postId === id).map((row) => row.name),
        },
      ]),
    );
  },
  saveRelations: async (tx, id, input) => {
    await syncLinks(
      tx,
      blogPostCategories,
      "postId",
      id,
      "categoryId",
      input.categoryIds,
      (_, index) => ({ displayOrder: index }),
    );
    await syncLinks(tx, blogPostTags, "postId", id, "tagId", await ensureTags(tx, input.tags));
    await syncLinks(tx, blogPostProjects, "postId", id, "projectId", input.projectIds);
    await syncLinks(tx, blogPostResearch, "postId", id, "researchId", input.researchIds);
  },
  validate: async (db, input) => {
    await assertMediaExists(db, [
      { id: input.coverMediaId, kind: "image", path: "coverMediaId" },
      { id: input.seo.ogImageId, kind: "image", path: "seo.ogImageId" },
      ...blockMediaReferences(input.body, "body"),
    ]);
  },
});

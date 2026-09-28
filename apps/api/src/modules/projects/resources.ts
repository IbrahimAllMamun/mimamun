import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  categoryInput,
  PROJECT_TYPE_LABELS,
  projectInput,
  slugify,
  tagInput,
  type ProjectInput,
  type ProjectType,
} from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import {
  projectCategories,
  projectMedia,
  projectMetrics,
  projectPublications,
  projectResearch,
  projects,
  projectTags,
  tags,
} from "../../database/schema";
import { loadLinks, syncLinks } from "../../lib/content";
import { assertMediaExists, sectionMediaReferences } from "../../lib/media-refs";
import { defineResource, listItem } from "../../lib/resource";
import { buildSearchText } from "../../lib/search-text";

export const projectCategoryResource = defineResource({
  path: "project-categories",
  entityType: "project_category",
  label: "Project category",
  table: projectCategories,
  input: categoryInput,
  slugSource: "name",
  searchColumns: ["name", "slug"],
  defaultSort: [asc(projectCategories.displayOrder), asc(projectCategories.name)],
  listItem: (row) => listItem(row, { title: String(row.name), subtitle: (row.description as string | null) ?? null }),
});

export const tagResource = defineResource({
  path: "tags",
  entityType: "tag",
  label: "Tag",
  table: tags,
  input: tagInput,
  slugSource: "name",
  searchColumns: ["name", "slug"],
  defaultSort: [asc(tags.name)],
  listItem: (row) => listItem(row, { title: String(row.name), subtitle: String(row.slug) }),
});

/** Finds or creates tags by name and returns their ids in input order. */
export async function ensureTags(tx: DbExecutor, names: readonly string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const bySlug = new Map(names.map((name) => [slugify(name, 50), name]));
  await tx
    .insert(tags)
    .values([...bySlug].map(([slug, name]) => ({ slug, name })))
    .onConflictDoNothing({ target: tags.slug });
  const rows = await tx.select({ id: tags.id, slug: tags.slug }).from(tags).where(inArray(tags.slug, [...bySlug.keys()]));
  const ids = new Map(rows.map((row) => [row.slug, row.id]));
  return [...bySlug.keys()].map((slug) => ids.get(slug)).filter((id): id is string => Boolean(id));
}

async function tagNamesFor(db: DbExecutor, projectIds: string[]) {
  const rows = projectIds.length
    ? await db
        .select({ projectId: projectTags.projectId, name: tags.name })
        .from(projectTags)
        .innerJoin(tags, eq(tags.id, projectTags.tagId))
        .where(inArray(projectTags.projectId, projectIds))
    : [];
  const result = new Map<string, string[]>();
  for (const row of rows) result.set(row.projectId, [...(result.get(row.projectId) ?? []), row.name]);
  return result;
}

export const projectResource = defineResource<ProjectInput>({
  path: "projects",
  entityType: "project",
  label: "Project",
  table: projects,
  input: projectInput,
  slugSource: "title",
  seo: true,
  searchColumns: ["title", "summary", "organization"],
  defaultSort: [desc(projects.featured), asc(projects.displayOrder), desc(projects.updatedAt)],
  sorts: { title: [asc(projects.title)] },
  filters: (query) =>
    query.type && query.type in PROJECT_TYPE_LABELS ? [eq(projects.type, query.type as ProjectType)] : [],
  relationKeys: ["tags", "metrics", "gallery", "researchIds", "publicationIds"],
  listItem: (row) =>
    listItem(row, {
      title: String(row.title),
      subtitle: String(row.summary),
      extra: { type: PROJECT_TYPE_LABELS[row.type as ProjectType] },
    }),
  derived: (input) => ({
    searchText: buildSearchText({
      sections: input.sections,
      lists: [input.technologies, input.tags],
      texts: [input.organization, input.role],
    }),
  }),
  loadRelations: async (db, ids) => {
    // Sequential on purpose: `db` may be a transaction, which runs one query at a time.
    const tagNames = await tagNamesFor(db, ids);
    const research = await loadLinks(db, projectResearch, "projectId", ids, "researchId");
    const publications = await loadLinks(db, projectPublications, "projectId", ids, "publicationId");
    const metricRows = await db
      .select()
      .from(projectMetrics)
      .where(inArray(projectMetrics.projectId, ids))
      .orderBy(asc(projectMetrics.displayOrder));
    const mediaRows = await db
      .select()
      .from(projectMedia)
      .where(inArray(projectMedia.projectId, ids))
      .orderBy(asc(projectMedia.displayOrder));
    return new Map(
      ids.map((id) => [
        id,
        {
          tags: tagNames.get(id) ?? [],
          researchIds: research.get(id) ?? [],
          publicationIds: publications.get(id) ?? [],
          metrics: metricRows
            .filter((metric) => metric.projectId === id)
            .map(({ label, value, unit, context }) => ({ label, value, unit, context })),
          gallery: mediaRows
            .filter((item) => item.projectId === id)
            .map(({ mediaId, kind, caption }) => ({ mediaId, kind, caption })),
        },
      ]),
    );
  },
  saveRelations: async (tx, id, input) => {
    const tagIds = await ensureTags(tx, input.tags);
    await syncLinks(tx, projectTags, "projectId", id, "tagId", tagIds);
    await syncLinks(tx, projectResearch, "projectId", id, "researchId", input.researchIds);
    await syncLinks(tx, projectPublications, "projectId", id, "publicationId", input.publicationIds);
    await tx.delete(projectMetrics).where(eq(projectMetrics.projectId, id));
    if (input.metrics.length) {
      await tx.insert(projectMetrics).values(input.metrics.map((metric, index) => ({ ...metric, projectId: id, displayOrder: index })));
    }
    await tx.delete(projectMedia).where(eq(projectMedia.projectId, id));
    if (input.gallery.length) {
      await tx.insert(projectMedia).values(input.gallery.map((item, index) => ({ ...item, projectId: id, displayOrder: index })));
    }
  },
  validate: async (db, input) => {
    await assertMediaExists(db, [
      { id: input.coverMediaId, kind: "image", path: "coverMediaId" },
      { id: input.seo.ogImageId, kind: "image", path: "seo.ogImageId" },
      ...input.gallery.map((item, index) => ({ id: item.mediaId, path: `gallery.${index}` })),
      ...sectionMediaReferences(input.sections),
    ]);
  },
});

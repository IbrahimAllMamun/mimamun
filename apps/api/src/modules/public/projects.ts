import { and, asc, desc, eq, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import {
  collectBlockMediaIds,
  orderedSections,
  PROJECT_SECTIONS,
  yearOf,
  type Block,
  type GithubRepoDTO,
  type ProjectDetailDTO,
  type ProjectFacetsDTO,
  type ProjectLinkDTO,
  type ProjectSummaryDTO,
  type PublicProjectQuery,
} from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import {
  experienceProjects,
  experiences,
  githubRepositories,
  projectCategories,
  projectMedia,
  projectMetrics,
  projectPublications,
  projectResearch,
  projects,
  projectTags,
  publications,
  research,
  tags,
} from "../../database/schema";
import { iso, isoRequired } from "../../lib/http";
import { loadMediaMap, mediaRecord, pick } from "../media/mapper";
import { loadSeoById } from "./site";
import { listed, viewable, viewableUnless } from "./visibility";
import { toRepoDTO } from "./github";

type ProjectRow = typeof projects.$inferSelect;

function sectionCount(sections: ProjectRow["sections"]): number {
  return orderedSections(PROJECT_SECTIONS, sections).length;
}

export async function toProjectSummaries(
  db: DbExecutor,
  rows: ProjectRow[],
): Promise<ProjectSummaryDTO[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const categoryIds = [
    ...new Set(rows.map((row) => row.categoryId).filter((id): id is string => Boolean(id))),
  ];
  const [categoryRows, tagRows, mediaMap] = await Promise.all([
    categoryIds.length
      ? db.select().from(projectCategories).where(inArray(projectCategories.id, categoryIds))
      : Promise.resolve([]),
    db
      .select({ projectId: projectTags.projectId, name: tags.name, slug: tags.slug })
      .from(projectTags)
      .innerJoin(tags, eq(tags.id, projectTags.tagId))
      .where(inArray(projectTags.projectId, ids))
      .orderBy(asc(tags.name)),
    loadMediaMap(
      db,
      rows.map((row) => row.coverMediaId),
    ),
  ]);
  const categories = new Map(
    categoryRows.map((row) => [row.id, { name: row.name, slug: row.slug }]),
  );
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    type: row.type,
    category: row.categoryId ? (categories.get(row.categoryId) ?? null) : null,
    technologies: row.technologies,
    tags: tagRows
      .filter((tag) => tag.projectId === row.id)
      .map(({ name, slug }) => ({ name, slug })),
    organization: row.organization,
    startedOn: row.startedOn,
    completedOn: row.completedOn,
    year: yearOf(row.completedOn ?? row.startedOn),
    featured: row.featured,
    cover: pick(mediaMap, row.coverMediaId),
    publishedAt: iso(row.publishedAt),
    sectionCount: sectionCount(row.sections),
  }));
}

export function projectLink(row: Pick<ProjectRow, "slug" | "title" | "type">): ProjectLinkDTO {
  return { slug: row.slug, title: row.title, type: row.type };
}

function ordering(
  sort: PublicProjectQuery["sort"],
  hasQuery: boolean,
  q: string | null | undefined,
): SQL[] {
  const recency = sql`coalesce(${projects.completedOn}, ${projects.startedOn}, ${projects.publishedAt}::date)`;
  if (hasQuery && !sort && q) {
    return [
      sql`ts_rank(${projects.searchVector}, websearch_to_tsquery('english', ${q})) DESC`,
      desc(projects.featured),
    ];
  }
  switch (sort) {
    case "newest":
      return [sql`${recency} DESC NULLS LAST`, asc(projects.title)];
    case "oldest":
      return [sql`${recency} ASC NULLS LAST`, asc(projects.title)];
    case "title":
      return [asc(projects.title)];
    default:
      return [desc(projects.featured), asc(projects.displayOrder), sql`${recency} DESC NULLS LAST`];
  }
}

export async function listPublicProjects(
  db: DbExecutor,
  query: PublicProjectQuery,
): Promise<{ items: ProjectSummaryDTO[]; total: number; facets: ProjectFacetsDTO }> {
  const filters: SQL[] = [listed(projects)];
  const q = query.q?.trim();
  if (q) {
    const text = or(
      sql`${projects.searchVector} @@ websearch_to_tsquery('english', ${q})`,
      sql`${projects.title} ILIKE ${`%${q.replace(/[%_\\]/g, "\\$&")}%`}`,
    );
    if (text) filters.push(text);
  }
  if (query.category) {
    filters.push(
      sql`${projects.categoryId} IN (SELECT id FROM ${projectCategories} WHERE ${projectCategories.slug} = ${query.category})`,
    );
  }
  if (query.tech) filters.push(sql`${projects.technologies} @> ARRAY[${query.tech}]::text[]`);
  if (query.year)
    filters.push(
      sql`extract(year from coalesce(${projects.completedOn}, ${projects.startedOn})) = ${query.year}`,
    );
  if (query.type) filters.push(eq(projects.type, query.type));
  if (query.featured === "true") filters.push(eq(projects.featured, true));

  const where = and(...filters);
  const [rows, [countRow], facetRows, categoryRows] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(where)
      .orderBy(...ordering(query.sort ?? null, Boolean(q), q))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(projects)
      .where(where),
    db
      .select({
        categoryId: projects.categoryId,
        technologies: projects.technologies,
        type: projects.type,
        year: sql<
          number | null
        >`extract(year from coalesce(${projects.completedOn}, ${projects.startedOn}))::int`,
      })
      .from(projects)
      .where(listed(projects)),
    db
      .select()
      .from(projectCategories)
      .orderBy(asc(projectCategories.displayOrder), asc(projectCategories.name)),
  ]);

  const count = <K>(values: K[]) => {
    const map = new Map<K, number>();
    for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  };
  const categoryCounts = count(facetRows.map((row) => row.categoryId).filter(Boolean));
  const techCounts = count(facetRows.flatMap((row) => row.technologies));
  const yearCounts = count(
    facetRows.map((row) => row.year).filter((year): year is number => year !== null),
  );
  const typeCounts = count(facetRows.map((row) => row.type));

  return {
    items: await toProjectSummaries(db, rows),
    total: countRow?.value ?? 0,
    facets: {
      categories: categoryRows
        .filter((row) => categoryCounts.has(row.id))
        .map((row) => ({ name: row.name, slug: row.slug, count: categoryCounts.get(row.id) ?? 0 })),
      technologies: [...techCounts]
        .map(([name, value]) => ({ name, count: value }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      years: [...yearCounts]
        .map(([year, value]) => ({ year, count: value }))
        .sort((a, b) => b.year - a.year),
      types: [...typeCounts].map(([type, value]) => ({ type, count: value })),
    },
  };
}

/** Builds the full case study. `preview` loads by id and ignores publication state. */
export async function getProjectDetail(
  db: DbExecutor,
  key: { slug?: string; id?: string },
  preview = false,
): Promise<ProjectDetailDTO | null> {
  const identity = key.id ? eq(projects.id, key.id) : eq(projects.slug, key.slug ?? "");
  const [row] = await db
    .select()
    .from(projects)
    .where(and(identity, viewableUnless(preview, projects)));
  if (!row) return null;

  const sections = orderedSections(PROJECT_SECTIONS, row.sections);
  const blockMediaIds = sections.flatMap((section) =>
    collectBlockMediaIds(section.blocks as Block[]),
  );

  const [summary] = await toProjectSummaries(db, [row]);
  const [
    metricRows,
    galleryRows,
    researchRows,
    publicationRows,
    relatedRows,
    experienceRows,
    repoRows,
  ] = await Promise.all([
    db
      .select()
      .from(projectMetrics)
      .where(eq(projectMetrics.projectId, row.id))
      .orderBy(asc(projectMetrics.displayOrder)),
    db
      .select()
      .from(projectMedia)
      .where(eq(projectMedia.projectId, row.id))
      .orderBy(asc(projectMedia.displayOrder)),
    db
      .select({ slug: research.slug, title: research.title, kind: research.kind })
      .from(projectResearch)
      .innerJoin(research, eq(research.id, projectResearch.researchId))
      .where(and(eq(projectResearch.projectId, row.id), viewable(research))),
    db
      .select({
        slug: publications.slug,
        title: publications.title,
        venue: publications.venue,
        publishedOn: publications.publishedOn,
      })
      .from(projectPublications)
      .innerJoin(publications, eq(publications.id, projectPublications.publicationId))
      .where(and(eq(projectPublications.projectId, row.id), viewable(publications))),
    db
      .select()
      .from(projects)
      .where(
        and(
          listed(projects),
          ne(projects.id, row.id),
          row.categoryId ? eq(projects.categoryId, row.categoryId) : eq(projects.type, row.type),
        ),
      )
      .orderBy(desc(projects.featured), asc(projects.displayOrder))
      .limit(3),
    db
      .select({ company: experiences.company, position: experiences.position })
      .from(experienceProjects)
      .innerJoin(experiences, eq(experiences.id, experienceProjects.experienceId))
      .where(and(eq(experienceProjects.projectId, row.id), eq(experiences.isVisible, true))),
    db
      .select()
      .from(githubRepositories)
      .where(
        and(eq(githubRepositories.projectId, row.id), eq(githubRepositories.isSelected, true)),
      ),
  ]);

  const mediaMap = await loadMediaMap(db, [
    ...blockMediaIds,
    ...galleryRows.map((item) => item.mediaId),
  ]);
  const repositories: GithubRepoDTO[] = repoRows.map((repo) => toRepoDTO(repo, projectLink(row)));

  return {
    ...(summary as ProjectSummaryDTO),
    role: row.role,
    links: { github: row.githubUrl, demo: row.demoUrl, docs: row.docsUrl },
    sections,
    metrics: metricRows.map(({ label, value, unit, context }) => ({ label, value, unit, context })),
    gallery: galleryRows
      .map((item) => ({
        media: mediaMap.get(item.mediaId),
        kind: item.kind,
        caption: item.caption,
      }))
      .filter((item): item is ProjectDetailDTO["gallery"][number] => Boolean(item.media)),
    relatedResearch: researchRows,
    relatedPublications: publicationRows,
    relatedProjects: await toProjectSummaries(db, relatedRows),
    experiences: experienceRows,
    repositories,
    media: mediaRecord(mediaMap, blockMediaIds),
    seo: await loadSeoById(db, row.seoId),
    status: row.status,
    updatedAt: isoRequired(row.updatedAt),
  };
}

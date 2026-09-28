import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  collectBlockMediaIds,
  formatApaCitation,
  formatBibtex,
  formatResearchCitation,
  orderedSections,
  RESEARCH_SECTIONS,
  yearOf,
  type Block,
  type PresentationDTO,
  type PublicationDTO,
  type ResearchDetailDTO,
  type ResearchKind,
  type ResearchSummaryDTO,
} from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import {
  conferencePresentations,
  education,
  projectResearch,
  projects,
  publications,
  research,
} from "../../database/schema";
import { isoRequired } from "../../lib/http";
import { loadMediaMap, mediaRecord, pick } from "../media/mapper";
import { projectLink } from "./projects";
import { loadSeoById } from "./site";
import { listed, viewable, viewableUnless } from "./visibility";

type ResearchRow = typeof research.$inferSelect;
type PublicationRow = typeof publications.$inferSelect;
type PresentationRow = typeof conferencePresentations.$inferSelect;

const KIND_NOUNS: Record<ResearchKind, string> = {
  thesis: "thesis",
  academic_project: "project",
  research_project: "research project",
  working_paper: "working paper",
  report: "report",
};

export async function toPresentationDTOs(db: DbExecutor, rows: PresentationRow[]): Promise<PresentationDTO[]> {
  if (rows.length === 0) return [];
  const researchIds = rows.map((row) => row.researchId).filter((id): id is string => Boolean(id));
  const [mediaMap, researchRows] = await Promise.all([
    loadMediaMap(db, rows.flatMap((row) => [row.posterMediaId, row.slidesMediaId])),
    researchIds.length
      ? db
          .select({ id: research.id, slug: research.slug, title: research.title, kind: research.kind })
          .from(research)
          .where(and(inArray(research.id, researchIds), viewable(research)))
      : Promise.resolve([]),
  ]);
  const linked = new Map(researchRows.map((row) => [row.id, { slug: row.slug, title: row.title, kind: row.kind }]));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    conferenceName: row.conferenceName,
    conferenceShortName: row.conferenceShortName,
    edition: row.edition,
    location: row.location,
    presentedOn: row.presentedOn,
    presentationType: row.presentationType,
    abstract: row.abstract,
    poster: pick(mediaMap, row.posterMediaId),
    slides: pick(mediaMap, row.slidesMediaId),
    eventUrl: row.eventUrl,
    research: row.researchId ? (linked.get(row.researchId) ?? null) : null,
  }));
}

export async function listPublishedPresentations(db: DbExecutor, limit?: number): Promise<PresentationDTO[]> {
  const query = db
    .select()
    .from(conferencePresentations)
    .where(listed(conferencePresentations))
    .orderBy(sql`${conferencePresentations.presentedOn} DESC NULLS LAST`, asc(conferencePresentations.displayOrder));
  return toPresentationDTOs(db, await (limit ? query.limit(limit) : query));
}

export async function toPublicationDTOs(db: DbExecutor, rows: PublicationRow[]): Promise<PublicationDTO[]> {
  if (rows.length === 0) return [];
  const researchIds = rows.map((row) => row.researchId).filter((id): id is string => Boolean(id));
  const [mediaMap, researchRows] = await Promise.all([
    loadMediaMap(db, rows.map((row) => row.pdfMediaId)),
    researchIds.length
      ? db
          .select({ id: research.id, slug: research.slug, title: research.title, kind: research.kind })
          .from(research)
          .where(and(inArray(research.id, researchIds), viewable(research)))
      : Promise.resolve([]),
  ]);
  const linked = new Map(researchRows.map((row) => [row.id, { slug: row.slug, title: row.title, kind: row.kind }]));
  return rows.map((row) => {
    const citable = {
      title: row.title,
      authors: row.authors,
      venue: row.venue,
      volume: row.volume,
      issue: row.issue,
      pages: row.pages,
      publisher: row.publisher,
      publishedOn: row.publishedOn,
      doi: row.doi,
      url: row.url,
      publicationType: row.publicationType,
    };
    return {
      id: row.id,
      slug: row.slug,
      ...citable,
      publicationStatus: row.publicationStatus,
      publicationType: row.publicationType,
      pdf: pick(mediaMap, row.pdfMediaId),
      abstract: row.abstract,
      keywords: row.keywords,
      methodology: row.methodology,
      findings: row.findings,
      citation: row.citationText ?? formatApaCitation(citable),
      bibtex: row.bibtex ?? formatBibtex(citable),
      research: row.researchId ? (linked.get(row.researchId) ?? null) : null,
      featured: row.featured,
    };
  });
}

export async function listPublishedPublications(db: DbExecutor): Promise<PublicationDTO[]> {
  const rows = await db
    .select()
    .from(publications)
    .where(listed(publications))
    .orderBy(sql`${publications.publishedOn} DESC NULLS LAST`, asc(publications.displayOrder));
  return toPublicationDTOs(db, rows);
}

export async function toResearchSummaries(db: DbExecutor, rows: ResearchRow[]): Promise<ResearchSummaryDTO[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [mediaMap, presentationRows, publicationCounts, educationRows] = await Promise.all([
    loadMediaMap(db, rows.map((row) => row.coverMediaId)),
    db
      .select()
      .from(conferencePresentations)
      .where(and(inArray(conferencePresentations.researchId, ids), listed(conferencePresentations)))
      .orderBy(sql`${conferencePresentations.presentedOn} DESC NULLS LAST`),
    db
      .select({ researchId: publications.researchId, value: sql<number>`count(*)::int` })
      .from(publications)
      .where(and(inArray(publications.researchId, ids), listed(publications)))
      .groupBy(publications.researchId),
    db
      .select({ id: education.id, startDate: education.startDate, endDate: education.endDate })
      .from(education)
      .where(inArray(education.id, rows.map((row) => row.educationId).filter((id): id is string => Boolean(id)))),
  ]);
  const presentations = await toPresentationDTOs(db, presentationRows);
  const counts = new Map(publicationCounts.map((row) => [row.researchId, row.value]));
  const educationById = new Map(educationRows.map((row) => [row.id, row]));
  return rows.map((row) => {
    const linkedEducation = row.educationId ? educationById.get(row.educationId) : undefined;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      kind: row.kind,
      summary: row.summary,
      keywords: row.keywords,
      methods: row.methods,
      authors: row.authors,
      degree: row.degree,
      institution: row.institution,
      startedOn: row.startedOn,
      completedOn: row.completedOn,
      // A degree project's year falls back to the programme's end date.
      year: yearOf(row.completedOn ?? linkedEducation?.endDate ?? row.startedOn),
      featured: row.featured,
      cover: pick(mediaMap, row.coverMediaId),
      presentations: presentations.filter((presentation) => presentationRows.find((p) => p.id === presentation.id)?.researchId === row.id),
      publicationCount: counts.get(row.id) ?? 0,
    };
  });
}

export async function listPublishedResearch(db: DbExecutor, options: { featuredOnly?: boolean; limit?: number } = {}) {
  const conditions = [listed(research)];
  if (options.featuredOnly) conditions.push(eq(research.featured, true));
  const query = db
    .select()
    .from(research)
    .where(and(...conditions))
    .orderBy(desc(research.featured), asc(research.displayOrder), sql`${research.completedOn} DESC NULLS LAST`);
  return toResearchSummaries(db, await (options.limit ? query.limit(options.limit) : query));
}

export async function getResearchDetail(
  db: DbExecutor,
  key: { slug?: string; id?: string },
  preview = false,
): Promise<ResearchDetailDTO | null> {
  const identity = key.id ? eq(research.id, key.id) : eq(research.slug, key.slug ?? "");
  const [row] = await db.select().from(research).where(and(identity, viewableUnless(preview, research)));
  if (!row) return null;
  const sections = orderedSections(RESEARCH_SECTIONS, row.sections);
  const blockMediaIds = sections.flatMap((section) => collectBlockMediaIds(section.blocks as Block[]));
  const [[summary], publicationRows, projectRows, educationRows, mediaMap] = await Promise.all([
    toResearchSummaries(db, [row]),
    db.select().from(publications).where(and(eq(publications.researchId, row.id), viewable(publications))),
    db
      .select({ slug: projects.slug, title: projects.title, type: projects.type })
      .from(projectResearch)
      .innerJoin(projects, eq(projects.id, projectResearch.projectId))
      .where(and(eq(projectResearch.researchId, row.id), viewable(projects))),
    row.educationId
      ? db.select().from(education).where(and(eq(education.id, row.educationId), eq(education.isVisible, true)))
      : Promise.resolve([]),
    loadMediaMap(db, [row.pdfMediaId, row.posterMediaId, row.slidesMediaId, ...blockMediaIds]),
  ]);
  const linkedEducation = educationRows[0];
  const base = summary as ResearchSummaryDTO;
  return {
    ...base,
    abstract: row.abstract,
    researchQuestion: row.researchQuestion,
    supervisor: row.supervisor,
    sections,
    pdf: pick(mediaMap, row.pdfMediaId),
    poster: pick(mediaMap, row.posterMediaId),
    slides: pick(mediaMap, row.slidesMediaId),
    externalUrl: row.externalUrl,
    education: linkedEducation
      ? { degree: linkedEducation.degree, fieldOfStudy: linkedEducation.fieldOfStudy, institution: linkedEducation.institution }
      : null,
    publications: await toPublicationDTOs(db, publicationRows),
    relatedProjects: projectRows.map(projectLink),
    media: mediaRecord(mediaMap, blockMediaIds),
    citation: formatResearchCitation({
      title: row.title,
      author: row.authors[0] ?? "",
      kindNoun: KIND_NOUNS[row.kind],
      degree: row.degree,
      institution: row.institution,
      completedOn: row.completedOn ?? linkedEducation?.endDate ?? null,
    }),
    seo: await loadSeoById(db, row.seoId),
    status: row.status,
    updatedAt: isoRequired(row.updatedAt),
  };
}

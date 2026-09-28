import { asc, desc, eq, sql } from "drizzle-orm";
import {
  PRESENTATION_TYPE_LABELS,
  presentationInput,
  PUBLICATION_STATUS_LABELS,
  publicationInput,
  RESEARCH_KIND_LABELS,
  researchInput,
  type PresentationInput,
  type PresentationType,
  type PublicationInput,
  type PublicationStatus,
  type ResearchInput,
  type ResearchKind,
} from "@portfolio/shared";
import {
  conferencePresentations,
  projectPublications,
  projectResearch,
  publications,
  research,
} from "../../database/schema";
import { loadLinks, syncLinks } from "../../lib/content";
import { assertMediaExists, sectionMediaReferences } from "../../lib/media-refs";
import { defineResource, listItem } from "../../lib/resource";
import { buildSearchText } from "../../lib/search-text";

export const researchResource = defineResource<ResearchInput>({
  path: "research",
  entityType: "research",
  label: "Research",
  table: research,
  input: researchInput,
  slugSource: "title",
  seo: true,
  searchColumns: ["title", "summary", "institution"],
  defaultSort: [desc(research.featured), asc(research.displayOrder), desc(research.updatedAt)],
  sorts: { title: [asc(research.title)] },
  filters: (query) =>
    query.type && query.type in RESEARCH_KIND_LABELS
      ? [eq(research.kind, query.type as ResearchKind)]
      : [],
  relationKeys: ["projectIds"],
  listItem: (row) =>
    listItem(row, {
      title: String(row.title),
      subtitle: String(row.summary),
      extra: { kind: RESEARCH_KIND_LABELS[row.kind as ResearchKind] },
    }),
  derived: (input) => ({
    searchText: buildSearchText({
      sections: input.sections,
      lists: [input.keywords, input.methods, input.authors],
      texts: [input.researchQuestion, input.degree, input.institution, input.supervisor],
    }),
  }),
  loadRelations: async (db, ids) => {
    const links = await loadLinks(db, projectResearch, "researchId", ids, "projectId");
    return new Map(ids.map((id) => [id, { projectIds: links.get(id) ?? [] }]));
  },
  saveRelations: (tx, id, input) =>
    syncLinks(tx, projectResearch, "researchId", id, "projectId", input.projectIds),
  validate: async (db, input) => {
    await assertMediaExists(db, [
      { id: input.pdfMediaId, kind: "document", path: "pdfMediaId" },
      { id: input.posterMediaId, path: "posterMediaId" },
      { id: input.slidesMediaId, kind: "document", path: "slidesMediaId" },
      { id: input.coverMediaId, kind: "image", path: "coverMediaId" },
      { id: input.seo.ogImageId, kind: "image", path: "seo.ogImageId" },
      ...sectionMediaReferences(input.sections),
    ]);
  },
});

export const publicationResource = defineResource<PublicationInput>({
  path: "publications",
  entityType: "publication",
  label: "Publication",
  table: publications,
  input: publicationInput,
  slugSource: "title",
  seo: true,
  searchColumns: ["title", "venue", "doi"],
  defaultSort: [sql`${publications.publishedOn} DESC NULLS LAST`, asc(publications.displayOrder)],
  sorts: { title: [asc(publications.title)] },
  relationKeys: ["projectIds"],
  listItem: (row) =>
    listItem(row, {
      title: String(row.title),
      subtitle: [row.venue, row.publishedOn].filter(Boolean).join(" · ") || null,
      extra: {
        publicationStatus: PUBLICATION_STATUS_LABELS[row.publicationStatus as PublicationStatus],
      },
    }),
  derived: (input) => ({
    searchText: buildSearchText({
      lists: [input.authors, input.keywords],
      texts: [input.venue, input.publisher, input.methodology, input.findings, input.doi],
    }),
  }),
  loadRelations: async (db, ids) => {
    const links = await loadLinks(db, projectPublications, "publicationId", ids, "projectId");
    return new Map(ids.map((id) => [id, { projectIds: links.get(id) ?? [] }]));
  },
  saveRelations: (tx, id, input) =>
    syncLinks(tx, projectPublications, "publicationId", id, "projectId", input.projectIds),
  validate: async (db, input) => {
    await assertMediaExists(db, [
      { id: input.pdfMediaId, kind: "document", path: "pdfMediaId" },
      { id: input.seo.ogImageId, kind: "image", path: "seo.ogImageId" },
    ]);
  },
});

export const presentationResource = defineResource<PresentationInput>({
  path: "presentations",
  entityType: "presentation",
  label: "Presentation",
  table: conferencePresentations,
  input: presentationInput,
  searchColumns: ["title", "conferenceName", "conferenceShortName", "location"],
  defaultSort: [
    sql`${conferencePresentations.presentedOn} DESC NULLS LAST`,
    asc(conferencePresentations.displayOrder),
  ],
  listItem: (row) =>
    listItem(row, {
      title: String(row.title),
      subtitle: [row.conferenceShortName ?? row.conferenceName, row.presentedOn]
        .filter(Boolean)
        .join(" · "),
      extra: { type: PRESENTATION_TYPE_LABELS[row.presentationType as PresentationType] },
    }),
  validate: async (db, input) => {
    await assertMediaExists(db, [
      { id: input.posterMediaId, path: "posterMediaId" },
      { id: input.slidesMediaId, kind: "document", path: "slidesMediaId" },
    ]);
  },
});

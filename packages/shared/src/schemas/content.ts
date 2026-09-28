import { z } from "zod";
import { blocksSchema } from "../content/blocks";
import { projectSectionsSchema, researchSectionsSchema } from "../content/sections";
import {
  CONTENT_STATUSES,
  PRESENTATION_TYPES,
  PROJECT_MEDIA_KINDS,
  PROJECT_TYPES,
  PUBLICATION_STATUSES,
  PUBLICATION_TYPES,
  RESEARCH_KINDS,
  SKILL_ICONS,
  SKILL_LEVELS,
  VISIBILITIES,
} from "../enums";
import {
  displayOrder,
  emptyToNull,
  idList,
  nullableDateTime,
  nullableIsoDate,
  nullableMonthDate,
  nullableText,
  nullableUrl,
  optionalSlug,
  requiredText,
  stringList,
  uuid,
} from "./common";
import { EMPTY_SEO, seoFieldsInput } from "./site";

const nullableId = z.preprocess(emptyToNull, uuid.nullable());

/** Fields shared by every editorial entity (draft → published → archived). */
const editorial = {
  status: z.enum(CONTENT_STATUSES).default("draft"),
  visibility: z.enum(VISIBILITIES).default("public"),
  featured: z.boolean().default(false),
  displayOrder,
  publishedAt: nullableDateTime,
};

const periodRefinement = {
  check: (value: { startedOn: string | null; completedOn: string | null }) =>
    !value.startedOn || !value.completedOn || value.completedOn >= value.startedOn,
  message: { error: "Completion must be after the start", path: ["completedOn"] },
};

// ── Taxonomies ────────────────────────────────────────────────────────────

export const categoryInput = z.object({
  name: requiredText(80, "Name"),
  slug: optionalSlug,
  description: nullableText(500, "Description"),
  displayOrder,
});
export type CategoryInput = z.infer<typeof categoryInput>;

export const tagInput = z.object({
  name: requiredText(50, "Name"),
  slug: optionalSlug,
});
export type TagInput = z.infer<typeof tagInput>;

// ── Projects ──────────────────────────────────────────────────────────────

export const projectMetricInput = z.object({
  label: requiredText(80, "Metric label"),
  value: requiredText(40, "Metric value"),
  unit: nullableText(20, "Unit"),
  context: nullableText(200, "Context"),
});
export type ProjectMetricInput = z.infer<typeof projectMetricInput>;

export const projectMediaInput = z.object({
  mediaId: uuid,
  kind: z.enum(PROJECT_MEDIA_KINDS).default("gallery"),
  caption: nullableText(300, "Caption"),
});
export type ProjectMediaInput = z.infer<typeof projectMediaInput>;

export const projectInput = z
  .object({
    title: requiredText(200, "Title"),
    slug: optionalSlug,
    summary: requiredText(320, "Short description"),
    type: z.enum(PROJECT_TYPES).default("professional"),
    categoryId: nullableId,
    role: nullableText(160, "Role"),
    organization: nullableText(160, "Organisation"),
    startedOn: nullableMonthDate,
    completedOn: nullableMonthDate,
    technologies: stringList(40, 60, "Technology"),
    tags: stringList(30, 50, "Tag"),
    githubUrl: nullableUrl,
    demoUrl: nullableUrl,
    docsUrl: nullableUrl,
    coverMediaId: nullableId,
    sections: projectSectionsSchema,
    metrics: z.array(projectMetricInput).max(12).default([]),
    gallery: z.array(projectMediaInput).max(40).default([]),
    researchIds: idList(),
    publicationIds: idList(),
    ...editorial,
    seo: seoFieldsInput.default(EMPTY_SEO),
  })
  .refine(periodRefinement.check, periodRefinement.message);
export type ProjectInput = z.infer<typeof projectInput>;

export const PROJECT_SORTS = ["featured", "newest", "oldest", "title"] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export const publicProjectQuery = z.object({
  q: z.preprocess(emptyToNull, z.string().max(120).nullable()).optional(),
  category: z.preprocess(emptyToNull, z.string().max(120).nullable()).optional(),
  tech: z.preprocess(emptyToNull, z.string().max(60).nullable()).optional(),
  year: z
    .preprocess(emptyToNull, z.coerce.number().int().min(1990).max(2100).nullable())
    .optional(),
  type: z.preprocess(emptyToNull, z.enum(PROJECT_TYPES).nullable()).optional(),
  featured: z.preprocess(emptyToNull, z.enum(["true", "false"]).nullable()).optional(),
  sort: z.preprocess(emptyToNull, z.enum(PROJECT_SORTS).nullable()).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(24),
});
export type PublicProjectQuery = z.infer<typeof publicProjectQuery>;

// ── Research ──────────────────────────────────────────────────────────────

export const researchInput = z
  .object({
    title: requiredText(300, "Title"),
    slug: optionalSlug,
    kind: z.enum(RESEARCH_KINDS).default("research_project"),
    summary: requiredText(320, "Short description"),
    abstract: nullableText(6000, "Abstract"),
    researchQuestion: nullableText(1000, "Research question"),
    sections: researchSectionsSchema,
    keywords: stringList(20, 60, "Keyword"),
    methods: stringList(20, 80, "Method"),
    authors: stringList(30, 160, "Author"),
    degree: nullableText(200, "Degree"),
    institution: nullableText(200, "Institution"),
    supervisor: nullableText(200, "Supervisor"),
    educationId: nullableId,
    startedOn: nullableMonthDate,
    completedOn: nullableMonthDate,
    pdfMediaId: nullableId,
    posterMediaId: nullableId,
    slidesMediaId: nullableId,
    coverMediaId: nullableId,
    externalUrl: nullableUrl,
    projectIds: idList(),
    ...editorial,
    seo: seoFieldsInput.default(EMPTY_SEO),
  })
  .refine(periodRefinement.check, periodRefinement.message);
export type ResearchInput = z.infer<typeof researchInput>;

const DOI_PATTERN = /^10\.\d{4,9}\/\S+$/;

export const publicationInput = z.object({
  title: requiredText(300, "Title"),
  slug: optionalSlug,
  authors: stringList(50, 160, "Author").refine((list) => list.length > 0, {
    error: "Add at least one author",
  }),
  publicationType: z.enum(PUBLICATION_TYPES).default("journal_article"),
  publicationStatus: z.enum(PUBLICATION_STATUSES).default("published"),
  venue: nullableText(300, "Journal or conference"),
  volume: nullableText(40, "Volume"),
  issue: nullableText(40, "Issue"),
  pages: nullableText(40, "Pages"),
  publisher: nullableText(200, "Publisher"),
  publishedOn: nullableIsoDate,
  doi: z.preprocess(
    (value) =>
      typeof value === "string"
        ? emptyToNull(value.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""))
        : emptyToNull(value),
    z.string().regex(DOI_PATTERN, { error: "Enter a DOI such as 10.1234/abcd.5678" }).nullable(),
  ),
  url: nullableUrl,
  pdfMediaId: nullableId,
  abstract: nullableText(6000, "Abstract"),
  keywords: stringList(20, 60, "Keyword"),
  methodology: nullableText(6000, "Methodology"),
  findings: nullableText(6000, "Findings"),
  citationText: nullableText(2000, "Citation"),
  bibtex: nullableText(6000, "BibTeX"),
  researchId: nullableId,
  projectIds: idList(),
  ...editorial,
  seo: seoFieldsInput.default(EMPTY_SEO),
});
export type PublicationInput = z.infer<typeof publicationInput>;

export const presentationInput = z.object({
  title: requiredText(300, "Title"),
  conferenceName: requiredText(300, "Conference"),
  conferenceShortName: nullableText(40, "Short name"),
  edition: nullableText(40, "Edition"),
  location: nullableText(160, "Location"),
  presentedOn: nullableMonthDate,
  presentationType: z.enum(PRESENTATION_TYPES).default("poster"),
  abstract: nullableText(6000, "Abstract"),
  posterMediaId: nullableId,
  slidesMediaId: nullableId,
  eventUrl: nullableUrl,
  researchId: nullableId,
  ...editorial,
});
export type PresentationInput = z.infer<typeof presentationInput>;

// ── Skills ────────────────────────────────────────────────────────────────

export const skillCategoryInput = z.object({
  name: requiredText(80, "Name"),
  slug: optionalSlug,
  parentId: nullableId,
  description: nullableText(500, "Description"),
  displayOrder,
  isVisible: z.boolean().default(true),
});
export type SkillCategoryInput = z.infer<typeof skillCategoryInput>;

export const skillInput = z.object({
  name: requiredText(80, "Name"),
  slug: optionalSlug,
  categoryId: uuid,
  description: nullableText(1000, "Description"),
  level: z.preprocess(emptyToNull, z.enum(SKILL_LEVELS).nullable()),
  years: z.preprocess(emptyToNull, z.coerce.number().min(0).max(60).nullable()),
  icon: z.preprocess(emptyToNull, z.enum(SKILL_ICONS).nullable()),
  technologies: stringList(20, 60, "Technology"),
  projectIds: idList(),
  featured: z.boolean().default(false),
  displayOrder,
  isVisible: z.boolean().default(true),
});
export type SkillInput = z.infer<typeof skillInput>;

// ── Credentials ───────────────────────────────────────────────────────────

export const credentialProviderInput = z.object({
  name: requiredText(120, "Name"),
  slug: optionalSlug,
  websiteUrl: nullableUrl,
  logoMediaId: nullableId,
  description: nullableText(1000, "Description"),
  displayOrder,
  isVisible: z.boolean().default(true),
});
export type CredentialProviderInput = z.infer<typeof credentialProviderInput>;

export const credentialTypeInput = z.object({
  name: requiredText(60, "Name"),
  slug: optionalSlug,
  description: nullableText(300, "Description"),
  displayOrder,
});
export type CredentialTypeInput = z.infer<typeof credentialTypeInput>;

export const credentialInput = z
  .object({
    providerId: uuid,
    parentId: nullableId,
    typeId: uuid,
    title: requiredText(200, "Title"),
    slug: optionalSlug,
    level: nullableText(60, "Level"),
    description: nullableText(4000, "Description"),
    issuedOn: nullableMonthDate,
    expiresOn: nullableMonthDate,
    credentialCode: nullableText(200, "Credential ID"),
    credentialUrl: nullableUrl,
    verificationUrl: nullableUrl,
    imageMediaId: nullableId,
    pdfMediaId: nullableId,
    relatedProjectId: nullableId,
    skillIds: idList(),
    featured: z.boolean().default(false),
    displayOrder,
    isVisible: z.boolean().default(true),
  })
  .refine((value) => !value.issuedOn || !value.expiresOn || value.expiresOn >= value.issuedOn, {
    error: "Expiry must be after the issue date",
    path: ["expiresOn"],
  });
export type CredentialInput = z.infer<typeof credentialInput>;

// ── Blog ──────────────────────────────────────────────────────────────────

export const blogPostInput = z.object({
  title: requiredText(200, "Title"),
  slug: optionalSlug,
  excerpt: nullableText(400, "Excerpt"),
  coverMediaId: nullableId,
  body: blocksSchema.default([]),
  categoryIds: idList(20),
  tags: stringList(20, 50, "Tag"),
  projectIds: idList(),
  researchIds: idList(),
  ...editorial,
  seo: seoFieldsInput.default(EMPTY_SEO),
});
export type BlogPostInput = z.infer<typeof blogPostInput>;

export const publicBlogQuery = z.object({
  q: z.preprocess(emptyToNull, z.string().max(120).nullable()).optional(),
  category: z.preprocess(emptyToNull, z.string().max(120).nullable()).optional(),
  tag: z.preprocess(emptyToNull, z.string().max(120).nullable()).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export type PublicBlogQuery = z.infer<typeof publicBlogQuery>;

// ── Admin list query (shared by all editorial lists) ─────────────────────

export const adminListQuery = z.object({
  q: z.preprocess(emptyToNull, z.string().max(200).nullable()).optional(),
  status: z.preprocess(emptyToNull, z.enum(CONTENT_STATUSES).nullable()).optional(),
  featured: z.preprocess(emptyToNull, z.enum(["true", "false"]).nullable()).optional(),
  visible: z.preprocess(emptyToNull, z.enum(["true", "false"]).nullable()).optional(),
  type: z.preprocess(emptyToNull, z.string().max(60).nullable()).optional(),
  parent: z.preprocess(emptyToNull, z.string().max(60).nullable()).optional(),
  sort: z.preprocess(emptyToNull, z.string().max(40).nullable()).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type AdminListQuery = z.infer<typeof adminListQuery>;

export const statusChangeInput = z.object({
  status: z.enum(CONTENT_STATUSES),
});

import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPES,
  EMPTY_SEO,
  NAV_LOCATIONS,
  PRESENTATION_TYPE_LABELS,
  PRESENTATION_TYPES,
  PROJECT_MEDIA_KINDS,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPES,
  PUBLICATION_STATUS_LABELS,
  PUBLICATION_STATUSES,
  PUBLICATION_TYPE_LABELS,
  PUBLICATION_TYPES,
  RESEARCH_KIND_LABELS,
  RESEARCH_KINDS,
  SKILL_ICONS,
  SKILL_LEVEL_LABELS,
  SKILL_LEVELS,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_PLATFORMS,
} from "@portfolio/shared";
import type { AdminField, AdminResource, FormRecord } from "./types";

const optionsFrom = <T extends string>(values: readonly T[], labels?: Record<T, string>) =>
  values.map((value) => ({
    value,
    label: labels?.[value] ?? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " "),
  }));

const str = (value: unknown) => (typeof value === "string" ? value : "");
const published = (record: FormRecord) =>
  record.status === "published" && record.visibility !== "unlisted";

const EDITORIAL_DEFAULTS = {
  status: "draft",
  visibility: "public",
  featured: false,
  displayOrder: 0,
  publishedAt: null,
};
const DISPLAY_DEFAULTS = { featured: false, isVisible: true, displayOrder: 0 };

const slug = (base: string): AdminField => ({
  name: "slug",
  label: "URL slug",
  kind: "slug",
  slugBase: base,
  help: "Created from the title when left empty. Changing it later breaks existing links.",
});
const seoGroup = {
  title: "Search and sharing",
  description: "Optional overrides for search engines and social cards.",
  fields: [{ name: "seo", label: "SEO", kind: "seo" } as AdminField],
};
const summary = (help: string): AdminField => ({
  name: "summary",
  label: "Short description",
  kind: "textarea",
  required: true,
  maxLength: 320,
  rows: 3,
  help,
});

const projects: AdminResource = {
  path: "projects",
  label: "Project",
  plural: "Projects",
  description: "Case studies: problem, data, method, model, evaluation, result and impact.",
  title: (record) => str(record.title) || "Untitled project",
  editorial: true,
  featurable: true,
  orderable: true,
  preview: "projects",
  publicPath: (record) =>
    published(record) && record.slug ? `/projects/${str(record.slug)}` : null,
  typeFilter: { label: "Type", options: optionsFrom(PROJECT_TYPES, PROJECT_TYPE_LABELS) },
  columns: [{ key: "type", label: "Type" }],
  sorts: [
    { value: "updated", label: "Recently updated" },
    { value: "title", label: "Title" },
    { value: "order", label: "Display order" },
  ],
  groups: [
    {
      title: "Basics",
      fields: [
        { name: "title", label: "Title", kind: "text", required: true, maxLength: 200 },
        slug("/projects/"),
        summary("One or two sentences, used on cards, in search results and as the page lead."),
        {
          name: "type",
          label: "Type",
          kind: "select",
          options: optionsFrom(PROJECT_TYPES, PROJECT_TYPE_LABELS),
          width: "half",
        },
        {
          name: "categoryId",
          label: "Category",
          kind: "relation",
          optionsType: "project-categories",
          emptyLabel: "No category",
          width: "half",
        },
        { name: "role", label: "My role", kind: "text", maxLength: 160, width: "half" },
        {
          name: "organization",
          label: "Organisation",
          kind: "text",
          maxLength: 160,
          width: "half",
        },
        { name: "startedOn", label: "Started", kind: "month", width: "half" },
        {
          name: "completedOn",
          label: "Completed",
          kind: "month",
          width: "half",
          help: "Leave empty if ongoing.",
        },
      ],
    },
    {
      title: "Case study",
      description: "Each section is optional; empty sections are not shown on the site.",
      fields: [{ name: "sections", label: "Sections", kind: "sections", sectionSet: "project" }],
    },
    {
      title: "Headline results",
      description: "Shown above the case study. Report only values you measured.",
      fields: [
        {
          name: "metrics",
          label: "Metrics",
          kind: "repeater",
          itemLabel: "Metric",
          maxItems: 12,
          fields: [
            {
              name: "label",
              label: "Label",
              kind: "text",
              required: true,
              maxLength: 80,
              width: "half",
              placeholder: "e.g. AUC",
            },
            {
              name: "value",
              label: "Value",
              kind: "text",
              required: true,
              maxLength: 40,
              width: "half",
              placeholder: "e.g. 0.81",
            },
            { name: "unit", label: "Unit", kind: "text", maxLength: 20, width: "half" },
            {
              name: "context",
              label: "Context",
              kind: "text",
              maxLength: 200,
              width: "half",
              placeholder: "e.g. hold-out set, 2024",
            },
          ],
        },
      ],
    },
    {
      title: "Media",
      fields: [
        { name: "coverMediaId", label: "Cover image", kind: "media", accept: "image" },
        {
          name: "gallery",
          label: "Gallery",
          kind: "repeater",
          itemLabel: "Image",
          maxItems: 40,
          fields: [
            { name: "mediaId", label: "File", kind: "media", accept: "any", required: true },
            {
              name: "kind",
              label: "Kind",
              kind: "select",
              options: optionsFrom(PROJECT_MEDIA_KINDS),
              width: "half",
            },
            { name: "caption", label: "Caption", kind: "text", maxLength: 300, width: "half" },
          ],
        },
      ],
    },
    {
      title: "Links and keywords",
      fields: [
        {
          name: "technologies",
          label: "Technologies",
          kind: "string-list",
          help: "Press Enter after each one.",
        },
        { name: "tags", label: "Tags", kind: "string-list" },
        { name: "githubUrl", label: "Code repository", kind: "url", width: "half" },
        { name: "demoUrl", label: "Live demo", kind: "url", width: "half" },
        { name: "docsUrl", label: "Documentation", kind: "url", width: "half" },
      ],
    },
    {
      title: "Related",
      fields: [
        { name: "researchIds", label: "Research", kind: "relations", optionsType: "research" },
        {
          name: "publicationIds",
          label: "Publications",
          kind: "relations",
          optionsType: "publications",
        },
      ],
    },
    seoGroup,
  ],
  initial: () => ({
    title: "",
    slug: "",
    summary: "",
    type: "professional",
    categoryId: null,
    role: "",
    organization: "",
    startedOn: null,
    completedOn: null,
    technologies: [],
    tags: [],
    githubUrl: "",
    demoUrl: "",
    docsUrl: "",
    coverMediaId: null,
    sections: {},
    metrics: [],
    gallery: [],
    researchIds: [],
    publicationIds: [],
    ...EDITORIAL_DEFAULTS,
    seo: EMPTY_SEO,
  }),
};

const research: AdminResource = {
  path: "research",
  label: "Research",
  plural: "Research",
  description: "Theses, dissertations and research projects in an academic layout.",
  title: (record) => str(record.title) || "Untitled research",
  editorial: true,
  featurable: true,
  orderable: true,
  preview: "research",
  publicPath: (record) =>
    published(record) && record.slug ? `/research/${str(record.slug)}` : null,
  typeFilter: { label: "Kind", options: optionsFrom(RESEARCH_KINDS, RESEARCH_KIND_LABELS) },
  columns: [{ key: "kind", label: "Kind" }],
  sorts: [
    { value: "updated", label: "Recently updated" },
    { value: "title", label: "Title" },
    { value: "order", label: "Display order" },
  ],
  groups: [
    {
      title: "Basics",
      fields: [
        { name: "title", label: "Title", kind: "text", required: true, maxLength: 300 },
        slug("/research/"),
        {
          name: "kind",
          label: "Kind",
          kind: "select",
          options: optionsFrom(RESEARCH_KINDS, RESEARCH_KIND_LABELS),
          width: "half",
        },
        {
          name: "educationId",
          label: "Degree",
          kind: "relation",
          optionsType: "education",
          emptyLabel: "Not part of a degree",
          width: "half",
        },
        summary("One or two sentences for lists and search results."),
        {
          name: "authors",
          label: "Authors",
          kind: "string-list",
          help: "In citation order, e.g. Ibrahim All-Mamun.",
        },
        {
          name: "degree",
          label: "Programme",
          kind: "text",
          maxLength: 200,
          width: "half",
          placeholder: "e.g. M.S. in Applied Statistics and Data Science",
        },
        { name: "institution", label: "Institution", kind: "text", maxLength: 200, width: "half" },
        { name: "supervisor", label: "Supervisor", kind: "text", maxLength: 200, width: "half" },
        { name: "externalUrl", label: "Repository record", kind: "url", width: "half" },
        { name: "startedOn", label: "Started", kind: "month", width: "half" },
        { name: "completedOn", label: "Completed", kind: "month", width: "half" },
      ],
    },
    {
      title: "Abstract",
      fields: [
        {
          name: "abstract",
          label: "Abstract",
          kind: "textarea",
          rows: 8,
          maxLength: 6000,
          help: "Plain text. Separate paragraphs with a blank line.",
        },
        {
          name: "researchQuestion",
          label: "Research question",
          kind: "textarea",
          rows: 3,
          maxLength: 1000,
        },
      ],
    },
    {
      title: "Sections",
      description: "Optional structured write-up.",
      fields: [{ name: "sections", label: "Sections", kind: "sections", sectionSet: "research" }],
    },
    {
      title: "Keywords and methods",
      fields: [
        { name: "keywords", label: "Keywords", kind: "string-list" },
        { name: "methods", label: "Methods", kind: "string-list" },
      ],
    },
    {
      title: "Files",
      fields: [
        { name: "pdfMediaId", label: "Full text (PDF)", kind: "media", accept: "document" },
        { name: "posterMediaId", label: "Poster", kind: "media", accept: "any" },
        { name: "slidesMediaId", label: "Slides (PDF)", kind: "media", accept: "document" },
        { name: "coverMediaId", label: "Cover image", kind: "media", accept: "image" },
      ],
    },
    {
      title: "Related",
      fields: [
        { name: "projectIds", label: "Projects", kind: "relations", optionsType: "projects" },
      ],
    },
    seoGroup,
  ],
  initial: () => ({
    title: "",
    slug: "",
    kind: "research_project",
    summary: "",
    abstract: "",
    researchQuestion: "",
    sections: {},
    keywords: [],
    methods: [],
    authors: [],
    degree: "",
    institution: "",
    supervisor: "",
    educationId: null,
    startedOn: null,
    completedOn: null,
    pdfMediaId: null,
    posterMediaId: null,
    slidesMediaId: null,
    coverMediaId: null,
    externalUrl: "",
    projectIds: [],
    ...EDITORIAL_DEFAULTS,
    seo: EMPTY_SEO,
  }),
};

const publications: AdminResource = {
  path: "publications",
  label: "Publication",
  plural: "Publications",
  description: "Journal articles, conference papers, preprints and reports.",
  title: (record) => str(record.title) || "Untitled publication",
  editorial: true,
  featurable: true,
  orderable: true,
  publicPath: (record) =>
    published(record) && record.slug ? `/publications#${str(record.slug)}` : null,
  columns: [{ key: "publicationStatus", label: "Stage" }],
  sorts: [
    { value: "updated", label: "Recently updated" },
    { value: "title", label: "Title" },
    { value: "order", label: "Display order" },
  ],
  groups: [
    {
      title: "Reference",
      fields: [
        { name: "title", label: "Title", kind: "text", required: true, maxLength: 300 },
        slug("/publications#"),
        {
          name: "authors",
          label: "Authors",
          kind: "string-list",
          required: true,
          help: "In the order they appear on the paper.",
        },
        {
          name: "publicationType",
          label: "Type",
          kind: "select",
          options: optionsFrom(PUBLICATION_TYPES, PUBLICATION_TYPE_LABELS),
          width: "half",
        },
        {
          name: "publicationStatus",
          label: "Stage",
          kind: "select",
          options: optionsFrom(PUBLICATION_STATUSES, PUBLICATION_STATUS_LABELS),
          width: "half",
        },
        { name: "venue", label: "Journal or conference", kind: "text", maxLength: 300 },
        { name: "volume", label: "Volume", kind: "text", maxLength: 40, width: "half" },
        { name: "issue", label: "Issue", kind: "text", maxLength: 40, width: "half" },
        { name: "pages", label: "Pages", kind: "text", maxLength: 40, width: "half" },
        { name: "publishedOn", label: "Publication date", kind: "date", width: "half" },
        { name: "publisher", label: "Publisher", kind: "text", maxLength: 200 },
        {
          name: "doi",
          label: "DOI",
          kind: "text",
          placeholder: "10.1234/abcd.5678",
          width: "half",
          help: "Only a real DOI; leave empty otherwise.",
        },
        { name: "url", label: "Publisher page", kind: "url", width: "half" },
        { name: "pdfMediaId", label: "PDF", kind: "media", accept: "document" },
      ],
    },
    {
      title: "Summary",
      fields: [
        { name: "abstract", label: "Abstract", kind: "textarea", rows: 6, maxLength: 6000 },
        { name: "keywords", label: "Keywords", kind: "string-list" },
        { name: "methodology", label: "Methodology", kind: "textarea", rows: 4, maxLength: 6000 },
        { name: "findings", label: "Findings", kind: "textarea", rows: 4, maxLength: 6000 },
      ],
    },
    {
      title: "Citation",
      description: "Leave empty to generate APA and BibTeX from the reference fields.",
      fields: [
        {
          name: "citationText",
          label: "Citation override",
          kind: "textarea",
          rows: 3,
          maxLength: 2000,
        },
        { name: "bibtex", label: "BibTeX override", kind: "code", rows: 6, maxLength: 6000 },
      ],
    },
    {
      title: "Related",
      fields: [
        {
          name: "researchId",
          label: "Research",
          kind: "relation",
          optionsType: "research",
          emptyLabel: "None",
        },
        { name: "projectIds", label: "Projects", kind: "relations", optionsType: "projects" },
      ],
    },
    seoGroup,
  ],
  initial: () => ({
    title: "",
    slug: "",
    authors: [],
    publicationType: "journal_article",
    publicationStatus: "published",
    venue: "",
    volume: "",
    issue: "",
    pages: "",
    publisher: "",
    publishedOn: null,
    doi: "",
    url: "",
    pdfMediaId: null,
    abstract: "",
    keywords: [],
    methodology: "",
    findings: "",
    citationText: "",
    bibtex: "",
    researchId: null,
    projectIds: [],
    ...EDITORIAL_DEFAULTS,
    seo: EMPTY_SEO,
  }),
};

const presentations: AdminResource = {
  path: "presentations",
  label: "Presentation",
  plural: "Presentations",
  description: "Conference posters, talks and invited presentations.",
  title: (record) => str(record.title) || "Untitled presentation",
  editorial: true,
  featurable: true,
  orderable: true,
  publicPath: (record) => (published(record) ? "/research" : null),
  columns: [{ key: "type", label: "Type" }],
  groups: [
    {
      title: "Presentation",
      fields: [
        { name: "title", label: "Title", kind: "text", required: true, maxLength: 300 },
        {
          name: "presentationType",
          label: "Type",
          kind: "select",
          options: optionsFrom(PRESENTATION_TYPES, PRESENTATION_TYPE_LABELS),
          width: "half",
        },
        { name: "presentedOn", label: "Date", kind: "month", width: "half" },
        {
          name: "conferenceName",
          label: "Conference",
          kind: "text",
          required: true,
          maxLength: 300,
        },
        {
          name: "conferenceShortName",
          label: "Short name",
          kind: "text",
          maxLength: 40,
          width: "half",
          placeholder: "e.g. ICASDS",
        },
        {
          name: "edition",
          label: "Edition",
          kind: "text",
          maxLength: 40,
          width: "half",
          placeholder: "e.g. 3rd",
        },
        { name: "location", label: "Location", kind: "text", maxLength: 160 },
        { name: "eventUrl", label: "Event page", kind: "url" },
        { name: "abstract", label: "Abstract", kind: "textarea", rows: 5, maxLength: 6000 },
      ],
    },
    {
      title: "Files and links",
      fields: [
        { name: "posterMediaId", label: "Poster", kind: "media", accept: "any" },
        { name: "slidesMediaId", label: "Slides (PDF)", kind: "media", accept: "document" },
        {
          name: "researchId",
          label: "Research",
          kind: "relation",
          optionsType: "research",
          emptyLabel: "None",
        },
      ],
    },
  ],
  initial: () => ({
    title: "",
    conferenceName: "",
    conferenceShortName: "",
    edition: "",
    location: "",
    presentedOn: null,
    presentationType: "poster",
    abstract: "",
    posterMediaId: null,
    slidesMediaId: null,
    eventUrl: "",
    researchId: null,
    ...EDITORIAL_DEFAULTS,
  }),
};

const blogPosts: AdminResource = {
  path: "blog-posts",
  label: "Post",
  plural: "Writing",
  description: "Notes and articles, written with content blocks.",
  title: (record) => str(record.title) || "Untitled post",
  editorial: true,
  featurable: true,
  preview: "blog-posts",
  publicPath: (record) => (published(record) && record.slug ? `/blog/${str(record.slug)}` : null),
  columns: [{ key: "readingTime", label: "Minutes" }],
  sorts: [
    { value: "updated", label: "Recently updated" },
    { value: "title", label: "Title" },
  ],
  groups: [
    {
      title: "Post",
      fields: [
        { name: "title", label: "Title", kind: "text", required: true, maxLength: 200 },
        slug("/blog/"),
        {
          name: "excerpt",
          label: "Excerpt",
          kind: "textarea",
          rows: 3,
          maxLength: 400,
          help: "Shown in lists and as the page lead.",
        },
        { name: "coverMediaId", label: "Cover image", kind: "media", accept: "image" },
      ],
    },
    { title: "Content", fields: [{ name: "body", label: "Body", kind: "blocks" }] },
    {
      title: "Organisation",
      fields: [
        {
          name: "categoryIds",
          label: "Categories",
          kind: "relations",
          optionsType: "blog-categories",
        },
        { name: "tags", label: "Tags", kind: "string-list" },
        {
          name: "projectIds",
          label: "Related projects",
          kind: "relations",
          optionsType: "projects",
        },
        {
          name: "researchIds",
          label: "Related research",
          kind: "relations",
          optionsType: "research",
        },
      ],
    },
    seoGroup,
  ],
  initial: () => ({
    title: "",
    slug: "",
    excerpt: "",
    coverMediaId: null,
    body: [],
    categoryIds: [],
    tags: [],
    projectIds: [],
    researchIds: [],
    ...EDITORIAL_DEFAULTS,
    seo: EMPTY_SEO,
  }),
};

const experiences: AdminResource = {
  path: "experiences",
  label: "Role",
  plural: "Experience",
  description: "Positions shown on the experience page and the trajectory figure.",
  title: (record) =>
    [str(record.position), str(record.company)].filter(Boolean).join(", ") || "New role",
  featurable: true,
  visibleToggle: true,
  orderable: true,
  publicPath: () => "/experience",
  groups: [
    {
      title: "Position",
      fields: [
        {
          name: "position",
          label: "Position",
          kind: "text",
          required: true,
          maxLength: 160,
          width: "half",
        },
        {
          name: "company",
          label: "Company",
          kind: "text",
          required: true,
          maxLength: 160,
          width: "half",
        },
        { name: "department", label: "Department or team", kind: "text", maxLength: 200 },
        {
          name: "employmentType",
          label: "Employment type",
          kind: "select",
          options: optionsFrom(EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS),
          emptyLabel: "Not stated",
          width: "half",
        },
        { name: "location", label: "Location", kind: "text", maxLength: 160, width: "half" },
        {
          name: "startDate",
          label: "Start",
          kind: "month",
          width: "half",
          help: "Leave empty if not known.",
        },
        { name: "endDate", label: "End", kind: "month", width: "half" },
        {
          name: "isCurrent",
          label: "This is my current position",
          kind: "boolean",
          help: "A current position has no end date.",
        },
        { name: "companyUrl", label: "Company website", kind: "url", width: "half" },
        { name: "companyLogoId", label: "Company logo", kind: "media", accept: "image" },
      ],
    },
    {
      title: "Work",
      fields: [
        { name: "summary", label: "Summary", kind: "textarea", rows: 3, maxLength: 4000 },
        {
          name: "responsibilities",
          label: "Responsibilities",
          kind: "lines",
          rows: 6,
          help: "One per line.",
        },
        {
          name: "achievements",
          label: "Achievements",
          kind: "lines",
          rows: 4,
          help: "One per line. Only results you can stand behind.",
        },
        {
          name: "metrics",
          label: "Metrics",
          kind: "repeater",
          itemLabel: "Metric",
          maxItems: 8,
          fields: [
            {
              name: "label",
              label: "Label",
              kind: "text",
              required: true,
              maxLength: 80,
              width: "half",
            },
            {
              name: "value",
              label: "Value",
              kind: "text",
              required: true,
              maxLength: 40,
              width: "half",
            },
            { name: "context", label: "Context", kind: "text", maxLength: 200 },
          ],
        },
        { name: "technologies", label: "Tools", kind: "string-list" },
        { name: "domains", label: "Domains", kind: "string-list" },
        {
          name: "projectIds",
          label: "Projects from this role",
          kind: "relations",
          optionsType: "projects",
        },
      ],
    },
  ],
  initial: () => ({
    company: "",
    companyUrl: "",
    companyLogoId: null,
    position: "",
    department: "",
    employmentType: null,
    location: "",
    startDate: null,
    endDate: null,
    isCurrent: false,
    summary: "",
    responsibilities: [],
    achievements: [],
    technologies: [],
    domains: [],
    metrics: [],
    projectIds: [],
    ...DISPLAY_DEFAULTS,
  }),
};

const education: AdminResource = {
  path: "education",
  label: "Degree",
  plural: "Education",
  description: "Degrees and programmes, with grades and final projects.",
  title: (record) =>
    [str(record.degree), str(record.fieldOfStudy)].filter(Boolean).join(" in ") || "New degree",
  featurable: true,
  visibleToggle: true,
  orderable: true,
  publicPath: () => "/about#education",
  groups: [
    {
      title: "Programme",
      fields: [
        {
          name: "degree",
          label: "Degree",
          kind: "text",
          required: true,
          maxLength: 120,
          width: "half",
          placeholder: "e.g. M.S.",
        },
        {
          name: "fieldOfStudy",
          label: "Field of study",
          kind: "text",
          maxLength: 200,
          width: "half",
        },
        { name: "institution", label: "Institution", kind: "text", required: true, maxLength: 200 },
        { name: "location", label: "Location", kind: "text", maxLength: 160, width: "half" },
        { name: "institutionUrl", label: "Institution website", kind: "url", width: "half" },
        { name: "startDate", label: "Start", kind: "month", width: "half" },
        { name: "endDate", label: "End", kind: "month", width: "half" },
        { name: "isCurrent", label: "I am currently enrolled", kind: "boolean" },
        { name: "institutionLogoId", label: "Institution logo", kind: "media", accept: "image" },
      ],
    },
    {
      title: "Results",
      fields: [
        {
          name: "gradeLabel",
          label: "Grade label",
          kind: "text",
          maxLength: 40,
          width: "half",
          placeholder: "e.g. CGPA",
        },
        { name: "gradeValue", label: "Grade", kind: "number", step: 0.01, min: 0, width: "half" },
        {
          name: "gradeScale",
          label: "Out of",
          kind: "number",
          step: 0.01,
          min: 0,
          width: "half",
          placeholder: "e.g. 4.00",
        },
        { name: "projectTitle", label: "Project or thesis title", kind: "text", maxLength: 300 },
        { name: "description", label: "Description", kind: "markdown", rows: 4, maxLength: 4000 },
        { name: "courses", label: "Selected courses", kind: "string-list" },
      ],
    },
  ],
  initial: () => ({
    institution: "",
    institutionUrl: "",
    institutionLogoId: null,
    degree: "",
    fieldOfStudy: "",
    location: "",
    startDate: null,
    endDate: null,
    isCurrent: false,
    gradeLabel: "",
    gradeValue: null,
    gradeScale: null,
    projectTitle: "",
    description: "",
    courses: [],
    ...DISPLAY_DEFAULTS,
  }),
};

const taxonomy = (
  path: string,
  label: string,
  plural: string,
  description: string,
  withDescription: boolean,
): AdminResource => ({
  path,
  label,
  plural,
  description,
  title: (record) => str(record.name) || `New ${label.toLowerCase()}`,
  orderable: withDescription,
  groups: [
    {
      title: label,
      fields: [
        { name: "name", label: "Name", kind: "text", required: true, maxLength: 80 },
        {
          name: "slug",
          label: "URL slug",
          kind: "slug",
          help: "Created from the name when left empty.",
        },
        ...(withDescription
          ? [
              {
                name: "description",
                label: "Description",
                kind: "textarea",
                rows: 3,
                maxLength: 500,
              } as AdminField,
            ]
          : []),
      ],
    },
  ],
  initial: () => ({
    name: "",
    slug: "",
    ...(withDescription ? { description: "", displayOrder: 0 } : {}),
  }),
});

const skillCategories: AdminResource = {
  path: "skill-categories",
  label: "Skill category",
  plural: "Skill categories",
  description: "Areas of the toolkit table; categories can be nested.",
  title: (record) => str(record.name) || "New category",
  visibleToggle: true,
  orderable: true,
  tree: { parentKey: "parentId" },
  groups: [
    {
      title: "Category",
      fields: [
        { name: "name", label: "Name", kind: "text", required: true, maxLength: 80 },
        { name: "slug", label: "URL slug", kind: "slug" },
        {
          name: "parentId",
          label: "Parent",
          kind: "relation",
          optionsType: "skill-categories",
          emptyLabel: "Top level",
          filterOptions: (option, record) => option.id !== record.id,
        },
        { name: "description", label: "Description", kind: "textarea", rows: 3, maxLength: 500 },
      ],
    },
  ],
  initial: () => ({
    name: "",
    slug: "",
    parentId: null,
    description: "",
    displayOrder: 0,
    isVisible: true,
  }),
};

const skills: AdminResource = {
  path: "skills",
  label: "Skill",
  plural: "Skills",
  description: "Skills and tools. Levels are optional and never shown as percentages.",
  title: (record) => str(record.name) || "New skill",
  featurable: true,
  visibleToggle: true,
  orderable: true,
  publicPath: () => "/about",
  parentFilter: { label: "Category", optionsType: "skill-categories" },
  groups: [
    {
      title: "Skill",
      fields: [
        { name: "name", label: "Name", kind: "text", required: true, maxLength: 80, width: "half" },
        {
          name: "categoryId",
          label: "Category",
          kind: "relation",
          optionsType: "skill-categories",
          required: true,
          width: "half",
        },
        { name: "slug", label: "URL slug", kind: "slug" },
        {
          name: "level",
          label: "Level",
          kind: "select",
          options: optionsFrom(SKILL_LEVELS, SKILL_LEVEL_LABELS),
          emptyLabel: "Not stated",
          width: "half",
          help: "Optional. Leave empty rather than guess.",
        },
        {
          name: "years",
          label: "Years of use",
          kind: "number",
          min: 0,
          max: 60,
          step: 0.5,
          width: "half",
        },
        {
          name: "icon",
          label: "Icon",
          kind: "select",
          options: optionsFrom(SKILL_ICONS),
          emptyLabel: "None",
          width: "half",
        },
        { name: "description", label: "Description", kind: "textarea", rows: 3, maxLength: 1000 },
        { name: "technologies", label: "Related technologies", kind: "string-list" },
        {
          name: "projectIds",
          label: "Used in projects",
          kind: "relations",
          optionsType: "projects",
        },
      ],
    },
  ],
  initial: () => ({
    name: "",
    slug: "",
    categoryId: null,
    description: "",
    level: null,
    years: null,
    icon: null,
    technologies: [],
    projectIds: [],
    ...DISPLAY_DEFAULTS,
  }),
};

const credentialProviders: AdminResource = {
  path: "credential-providers",
  label: "Provider",
  plural: "Providers",
  description: "Organisations that issue certificates, e.g. Coursera or a university society.",
  title: (record) => str(record.name) || "New provider",
  visibleToggle: true,
  orderable: true,
  publicPath: (record) => (record.slug ? `/certifications#${str(record.slug)}` : null),
  groups: [
    {
      title: "Provider",
      fields: [
        { name: "name", label: "Name", kind: "text", required: true, maxLength: 120 },
        { name: "slug", label: "URL slug", kind: "slug" },
        { name: "websiteUrl", label: "Website", kind: "url" },
        { name: "logoMediaId", label: "Logo", kind: "media", accept: "image" },
        { name: "description", label: "Description", kind: "textarea", rows: 3, maxLength: 1000 },
      ],
    },
  ],
  initial: () => ({
    name: "",
    slug: "",
    websiteUrl: "",
    logoMediaId: null,
    description: "",
    displayOrder: 0,
    isVisible: true,
  }),
};

const credentialTypes = {
  ...taxonomy(
    "credential-types",
    "Credential type",
    "Credential types",
    "Programme, specialisation, track, course, certificate, workshop…",
    true,
  ),
  groups: [
    {
      title: "Credential type",
      fields: [
        { name: "name", label: "Name", kind: "text", required: true, maxLength: 60 } as AdminField,
        { name: "slug", label: "URL slug", kind: "slug" } as AdminField,
        {
          name: "description",
          label: "Description",
          kind: "textarea",
          rows: 2,
          maxLength: 300,
        } as AdminField,
      ],
    },
  ],
} satisfies AdminResource;

const credentials: AdminResource = {
  path: "credentials",
  label: "Certification",
  plural: "Certifications",
  description: "Programmes, courses and certificates, nested under their provider.",
  title: (record) => str(record.title) || "New certification",
  featurable: true,
  visibleToggle: true,
  orderable: true,
  publicPath: (record) =>
    record.slug && record.isVisible !== false ? `/certifications/${str(record.slug)}` : null,
  parentFilter: { label: "Provider", optionsType: "credential-providers" },
  tree: { parentKey: "parentId", groupKey: "providerId", groupOptionsType: "credential-providers" },
  groups: [
    {
      title: "Place in the hierarchy",
      description: "Provider → programme → course → certificate. Nest items to any depth.",
      fields: [
        {
          name: "providerId",
          label: "Provider",
          kind: "relation",
          optionsType: "credential-providers",
          required: true,
          width: "half",
        },
        {
          name: "typeId",
          label: "Type",
          kind: "relation",
          optionsType: "credential-types",
          required: true,
          width: "half",
        },
        {
          name: "parentId",
          label: "Part of",
          kind: "relation",
          optionsType: "credentials",
          emptyLabel: "Nothing (top level)",
          help: "Only items from the same provider can be chosen.",
          filterOptions: (option, record) =>
            option.id !== record.id && (option.hint ?? "").split("|")[1] === record.providerId,
        },
      ],
    },
    {
      title: "Credential",
      fields: [
        { name: "title", label: "Title", kind: "text", required: true, maxLength: 200 },
        slug("/certifications/"),
        {
          name: "level",
          label: "Level",
          kind: "text",
          maxLength: 60,
          width: "half",
          placeholder: "e.g. Beginner",
        },
        { name: "issuedOn", label: "Issued", kind: "month", width: "half" },
        { name: "expiresOn", label: "Expires", kind: "month", width: "half" },
        { name: "description", label: "Description", kind: "markdown", rows: 4, maxLength: 4000 },
      ],
    },
    {
      title: "Verification",
      description: "Only enter IDs and links that appear on the certificate itself.",
      fields: [
        { name: "credentialCode", label: "Credential ID", kind: "text", maxLength: 200 },
        { name: "credentialUrl", label: "Credential URL", kind: "url", width: "half" },
        { name: "verificationUrl", label: "Verification URL", kind: "url", width: "half" },
        { name: "imageMediaId", label: "Certificate image", kind: "media", accept: "image" },
        { name: "pdfMediaId", label: "Certificate PDF", kind: "media", accept: "document" },
      ],
    },
    {
      title: "Related",
      fields: [
        { name: "skillIds", label: "Skills", kind: "relations", optionsType: "skills" },
        {
          name: "relatedProjectId",
          label: "Applied in project",
          kind: "relation",
          optionsType: "projects",
          emptyLabel: "None",
        },
      ],
    },
  ],
  initial: () => ({
    providerId: null,
    parentId: null,
    typeId: null,
    title: "",
    slug: "",
    level: "",
    description: "",
    issuedOn: null,
    expiresOn: null,
    credentialCode: "",
    credentialUrl: "",
    verificationUrl: "",
    imageMediaId: null,
    pdfMediaId: null,
    relatedProjectId: null,
    skillIds: [],
    ...DISPLAY_DEFAULTS,
  }),
};

const simpleList = (
  path: string,
  label: string,
  plural: string,
  description: string,
  fields: AdminField[],
  initial: FormRecord,
  extra: Partial<AdminResource> = {},
): AdminResource => ({
  path,
  label,
  plural,
  description,
  title: (record) => str(record.title) || str(record.label) || `New ${label.toLowerCase()}`,
  visibleToggle: true,
  orderable: true,
  groups: [{ title: label, fields }],
  initial: () => ({ ...initial, displayOrder: 0, isVisible: true }),
  ...extra,
});

const socialLinks = simpleList(
  "social-links",
  "Social link",
  "Social links",
  "Profiles shown in the footer, on the contact page and in structured data.",
  [
    {
      name: "platform",
      label: "Platform",
      kind: "select",
      options: optionsFrom(SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABELS),
      width: "half",
    },
    { name: "label", label: "Label", kind: "text", required: true, maxLength: 60, width: "half" },
    {
      name: "url",
      label: "Link",
      kind: "text",
      required: true,
      placeholder: "https://… or mailto:…",
    },
    {
      name: "handle",
      label: "Handle",
      kind: "text",
      maxLength: 100,
      placeholder: "e.g. IbrahimAllMamun",
    },
  ],
  { platform: "github", label: "", url: "", handle: "" },
  { columns: [{ key: "platform", label: "Platform" }] },
);

const focusAreas = simpleList(
  "focus-areas",
  "Focus area",
  "Focus areas",
  "The “What I work on” section of the home page.",
  [
    { name: "title", label: "Title", kind: "text", required: true, maxLength: 120 },
    {
      name: "description",
      label: "Description",
      kind: "textarea",
      required: true,
      rows: 3,
      maxLength: 600,
    },
    {
      name: "evidence",
      label: "Evidence",
      kind: "textarea",
      rows: 2,
      maxLength: 300,
      help: "Where this shows up in your work. Optional.",
    },
  ],
  { title: "", description: "", evidence: "" },
  { publicPath: () => "/" },
);

const approachSteps = simpleList(
  "approach-steps",
  "Approach step",
  "Approach",
  "Steps of the “How I work with data” pipeline on the home and about pages.",
  [
    { name: "title", label: "Title", kind: "text", required: true, maxLength: 80 },
    {
      name: "description",
      label: "Description",
      kind: "textarea",
      required: true,
      rows: 2,
      maxLength: 400,
    },
    { name: "evidence", label: "Evidence", kind: "textarea", rows: 2, maxLength: 300 },
  ],
  { title: "", description: "", evidence: "" },
  { publicPath: () => "/about" },
);

const navigation = simpleList(
  "navigation",
  "Navigation item",
  "Navigation",
  "Links in the site header and footer.",
  [
    {
      name: "location",
      label: "Menu",
      kind: "select",
      options: optionsFrom(NAV_LOCATIONS),
      width: "half",
    },
    { name: "label", label: "Label", kind: "text", required: true, maxLength: 40, width: "half" },
    {
      name: "href",
      label: "Link",
      kind: "text",
      required: true,
      placeholder: "/projects or https://…",
    },
    { name: "openInNewTab", label: "Open in a new tab", kind: "boolean" },
  ],
  { location: "header", label: "", href: "", openInNewTab: false },
  {
    typeFilter: { label: "Menu", options: optionsFrom(NAV_LOCATIONS) },
    columns: [{ key: "location", label: "Menu" }],
  },
);

export const RESOURCES: AdminResource[] = [
  projects,
  research,
  publications,
  presentations,
  blogPosts,
  experiences,
  education,
  skills,
  skillCategories,
  credentials,
  credentialProviders,
  credentialTypes,
  taxonomy(
    "project-categories",
    "Project category",
    "Project categories",
    "Groups for filtering projects.",
    true,
  ),
  taxonomy(
    "tags",
    "Tag",
    "Tags",
    "Tags are created automatically when you add them to content.",
    false,
  ),
  taxonomy(
    "blog-categories",
    "Writing category",
    "Writing categories",
    "Groups for the writing index.",
    true,
  ),
  socialLinks,
  focusAreas,
  approachSteps,
  navigation,
];

export function findResource(path: string): AdminResource | undefined {
  return RESOURCES.find((resource) => resource.path === path);
}

/** Every options list a resource's form needs (relation fields, nested ones included). */
export function optionTypesFor(resource: AdminResource): string[] {
  const types = new Set<string>();
  const visit = (fields: readonly AdminField[]) => {
    for (const field of fields) {
      if (field.optionsType) types.add(field.optionsType);
      if (field.fields) visit(field.fields);
    }
  };
  for (const group of resource.groups) visit(group.fields);
  return [...types];
}

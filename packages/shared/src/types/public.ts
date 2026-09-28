import type { Block } from "../content/blocks";
import type {
  ContentStatus,
  EmploymentType,
  EntityType,
  MediaKind,
  PresentationType,
  ProjectMediaKind,
  ProjectType,
  PublicationStatus,
  PublicationType,
  ResearchKind,
  SkillIcon,
  SkillLevel,
  SocialPlatform,
} from "../enums";
import type { StaticRouteKey } from "../schemas/site";

/** Data transfer objects returned by `/api/public/*` (and reused by previews). */

export interface MediaDTO {
  id: string;
  url: string;
  kind: MediaKind;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string | null;
  title: string | null;
}

export interface SeoDTO {
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  ogImage: MediaDTO | null;
  noindex: boolean;
}

export interface SocialLinkDTO {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  handle: string | null;
}

export interface NavItemDTO {
  id: string;
  label: string;
  href: string;
  openInNewTab: boolean;
}

export interface CvDTO {
  url: string;
  downloadUrl: string;
  fileName: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface ProfileDTO {
  fullName: string;
  headline: string;
  statement: string | null;
  intro: string | null;
  bio: string | null;
  philosophy: string | null;
  researchInterests: string | null;
  interests: string | null;
  location: string | null;
  email: string | null;
  availability: string | null;
  avatar: MediaDTO | null;
  cv: CvDTO | null;
  updatedAt: string;
}

export interface SiteSettingsDTO {
  siteName: string;
  siteDescription: string;
  footerNote: string | null;
  contactFormEnabled: boolean;
  analyticsEnabled: boolean;
  defaultOgImage: MediaDTO | null;
}

export interface SiteDTO {
  profile: ProfileDTO;
  socialLinks: SocialLinkDTO[];
  navigation: { header: NavItemDTO[]; footer: NavItemDTO[] };
  settings: SiteSettingsDTO;
  routeSeo: Partial<Record<StaticRouteKey, SeoDTO>>;
}

export interface FocusAreaDTO {
  id: string;
  title: string;
  description: string;
  evidence: string | null;
}

export interface ApproachStepDTO {
  id: string;
  title: string;
  description: string;
  evidence: string | null;
}

export interface TaxonomyDTO {
  name: string;
  slug: string;
}

export interface ProjectLinkDTO {
  slug: string;
  title: string;
  type: ProjectType;
}

export interface ResearchLinkDTO {
  slug: string;
  title: string;
  kind: ResearchKind;
}

export interface PublicationLinkDTO {
  slug: string;
  title: string;
  venue: string | null;
  publishedOn: string | null;
}

export interface MetricDTO {
  label: string;
  value: string;
  unit?: string | null;
  context: string | null;
}

export interface ExperienceDTO {
  id: string;
  company: string;
  companyUrl: string | null;
  companyLogo: MediaDTO | null;
  position: string;
  department: string | null;
  employmentType: EmploymentType | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  summary: string | null;
  responsibilities: string[];
  achievements: string[];
  technologies: string[];
  domains: string[];
  metrics: MetricDTO[];
  featured: boolean;
  relatedProjects: ProjectLinkDTO[];
}

export interface EducationDTO {
  id: string;
  institution: string;
  institutionUrl: string | null;
  institutionLogo: MediaDTO | null;
  degree: string;
  fieldOfStudy: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  gradeLabel: string | null;
  gradeValue: number | null;
  gradeScale: number | null;
  projectTitle: string | null;
  description: string | null;
  courses: string[];
  research: ResearchLinkDTO[];
}

export interface RenderedSectionDTO {
  key: string;
  label: string;
  blocks: Block[];
}

export interface ProjectSummaryDTO {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: ProjectType;
  category: TaxonomyDTO | null;
  technologies: string[];
  tags: TaxonomyDTO[];
  organization: string | null;
  startedOn: string | null;
  completedOn: string | null;
  year: number | null;
  featured: boolean;
  cover: MediaDTO | null;
  publishedAt: string | null;
  sectionCount: number;
}

export interface ProjectGalleryItemDTO {
  media: MediaDTO;
  kind: ProjectMediaKind;
  caption: string | null;
}

export interface ProjectDetailDTO extends ProjectSummaryDTO {
  role: string | null;
  links: { github: string | null; demo: string | null; docs: string | null };
  sections: RenderedSectionDTO[];
  metrics: MetricDTO[];
  gallery: ProjectGalleryItemDTO[];
  relatedResearch: ResearchLinkDTO[];
  relatedPublications: PublicationLinkDTO[];
  relatedProjects: ProjectSummaryDTO[];
  experiences: { company: string; position: string }[];
  repositories: GithubRepoDTO[];
  media: Record<string, MediaDTO>;
  seo: SeoDTO;
  status: ContentStatus;
  updatedAt: string;
}

export interface ProjectFacetsDTO {
  categories: (TaxonomyDTO & { count: number })[];
  technologies: { name: string; count: number }[];
  years: { year: number; count: number }[];
  types: { type: ProjectType; count: number }[];
}

export interface PresentationDTO {
  id: string;
  title: string;
  conferenceName: string;
  conferenceShortName: string | null;
  edition: string | null;
  location: string | null;
  presentedOn: string | null;
  presentationType: PresentationType;
  abstract: string | null;
  poster: MediaDTO | null;
  slides: MediaDTO | null;
  eventUrl: string | null;
  research: ResearchLinkDTO | null;
}

export interface PublicationDTO {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  publicationType: PublicationType;
  publicationStatus: PublicationStatus;
  venue: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publisher: string | null;
  publishedOn: string | null;
  doi: string | null;
  url: string | null;
  pdf: MediaDTO | null;
  abstract: string | null;
  keywords: string[];
  methodology: string | null;
  findings: string | null;
  citation: string;
  bibtex: string;
  research: ResearchLinkDTO | null;
  featured: boolean;
}

export interface ResearchSummaryDTO {
  id: string;
  slug: string;
  title: string;
  kind: ResearchKind;
  summary: string;
  keywords: string[];
  methods: string[];
  authors: string[];
  degree: string | null;
  institution: string | null;
  startedOn: string | null;
  completedOn: string | null;
  year: number | null;
  featured: boolean;
  cover: MediaDTO | null;
  presentations: PresentationDTO[];
  publicationCount: number;
}

export interface ResearchDetailDTO extends ResearchSummaryDTO {
  abstract: string | null;
  researchQuestion: string | null;
  supervisor: string | null;
  sections: RenderedSectionDTO[];
  pdf: MediaDTO | null;
  poster: MediaDTO | null;
  slides: MediaDTO | null;
  externalUrl: string | null;
  education: { degree: string; fieldOfStudy: string | null; institution: string } | null;
  publications: PublicationDTO[];
  relatedProjects: ProjectLinkDTO[];
  media: Record<string, MediaDTO>;
  citation: string;
  seo: SeoDTO;
  status: ContentStatus;
  updatedAt: string;
}

export interface SkillDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  level: SkillLevel | null;
  years: number | null;
  icon: SkillIcon | null;
  technologies: string[];
  featured: boolean;
  projects: ProjectLinkDTO[];
}

export interface SkillCategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  skills: SkillDTO[];
  children: SkillCategoryDTO[];
}

export interface CredentialNodeDTO {
  id: string;
  slug: string;
  title: string;
  type: TaxonomyDTO;
  level: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  featured: boolean;
  verifiable: boolean;
  image: MediaDTO | null;
  children: CredentialNodeDTO[];
}

export interface CredentialProviderDTO {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  logo: MediaDTO | null;
  description: string | null;
  credentials: CredentialNodeDTO[];
  count: number;
}

export interface CredentialDetailDTO {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  type: TaxonomyDTO;
  provider: { name: string; slug: string; websiteUrl: string | null; logo: MediaDTO | null };
  issuedOn: string | null;
  expiresOn: string | null;
  credentialCode: string | null;
  credentialUrl: string | null;
  verificationUrl: string | null;
  image: MediaDTO | null;
  pdf: MediaDTO | null;
  skills: TaxonomyDTO[];
  relatedProject: ProjectLinkDTO | null;
  ancestors: { title: string; slug: string }[];
  children: CredentialNodeDTO[];
}

export interface BlogPostSummaryDTO {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover: MediaDTO | null;
  publishedAt: string | null;
  readingTimeMinutes: number;
  categories: TaxonomyDTO[];
  tags: TaxonomyDTO[];
  featured: boolean;
}

export interface BlogPostDetailDTO extends BlogPostSummaryDTO {
  body: Block[];
  media: Record<string, MediaDTO>;
  author: string | null;
  relatedProjects: ProjectLinkDTO[];
  relatedResearch: ResearchLinkDTO[];
  previous: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  seo: SeoDTO;
  status: ContentStatus;
  updatedAt: string;
}

export interface GithubRepoDTO {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepage: string | null;
  primaryLanguage: string | null;
  languages: { name: string; share: number }[];
  topics: string[];
  stars: number;
  forks: number;
  pushedAt: string | null;
  project: ProjectLinkDTO | null;
}

export interface GithubSectionDTO {
  username: string | null;
  profileUrl: string | null;
  repositories: GithubRepoDTO[];
  lastSyncedAt: string | null;
}

export interface TrajectoryItemDTO {
  id: string;
  kind: "education" | "experience" | "presentation" | "publication";
  label: string;
  sublabel: string | null;
  start: string | null;
  end: string | null;
  isCurrent: boolean;
  href: string | null;
}

export interface HomeDTO {
  focusAreas: FocusAreaDTO[];
  approachSteps: ApproachStepDTO[];
  featuredProjects: ProjectSummaryDTO[];
  featuredResearch: ResearchSummaryDTO[];
  presentations: PresentationDTO[];
  currentExperience: ExperienceDTO[];
  previousExperience: ExperienceDTO[];
  education: EducationDTO[];
  trajectory: TrajectoryItemDTO[];
  latestPosts: BlogPostSummaryDTO[];
  counts: {
    projects: number;
    research: number;
    publications: number;
    presentations: number;
    credentials: number;
    credentialProviders: number;
    posts: number;
  };
}

export interface AboutDTO {
  education: EducationDTO[];
  skills: SkillCategoryDTO[];
  focusAreas: FocusAreaDTO[];
  approachSteps: ApproachStepDTO[];
  experience: ExperienceDTO[];
  credentialSummary: { total: number; providers: { name: string; slug: string; count: number }[] };
}

export interface ExperiencePageDTO {
  experiences: ExperienceDTO[];
  education: EducationDTO[];
  trajectory: TrajectoryItemDTO[];
}

export interface ResearchPageDTO {
  research: ResearchSummaryDTO[];
  presentations: PresentationDTO[];
  publications: PublicationDTO[];
}

export interface SearchResultDTO {
  type: EntityType;
  title: string;
  url: string;
  excerpt: string | null;
  meta: string | null;
}

export interface SitemapEntryDTO {
  path: string;
  updatedAt: string;
}

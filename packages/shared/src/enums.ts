/**
 * Enumerations shared by the database schema, API validation and the UI.
 * Each list is the single source of truth for its values and labels.
 */

export const CONTENT_STATUSES = ["draft", "published", "archived"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

/** `unlisted` content is reachable by URL but omitted from listings, search and the sitemap. */
export const VISIBILITIES = ["public", "unlisted"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "freelance",
  "research",
  "volunteer",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
  research: "Research",
  volunteer: "Volunteer",
};

export const PROJECT_TYPES = ["professional", "research", "academic", "personal"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  professional: "Professional",
  research: "Research",
  academic: "Academic",
  personal: "Personal",
};

export const PROJECT_MEDIA_KINDS = ["gallery", "screenshot", "chart", "video", "document"] as const;
export type ProjectMediaKind = (typeof PROJECT_MEDIA_KINDS)[number];

export const RESEARCH_KINDS = [
  "thesis",
  "academic_project",
  "research_project",
  "working_paper",
  "report",
] as const;
export type ResearchKind = (typeof RESEARCH_KINDS)[number];
export const RESEARCH_KIND_LABELS: Record<ResearchKind, string> = {
  thesis: "Thesis",
  academic_project: "Academic project",
  research_project: "Research project",
  working_paper: "Working paper",
  report: "Report",
};

export const PUBLICATION_STATUSES = [
  "published",
  "in_press",
  "accepted",
  "under_review",
  "submitted",
  "preprint",
  "working_paper",
] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];
export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  published: "Published",
  in_press: "In press",
  accepted: "Accepted",
  under_review: "Under review",
  submitted: "Submitted",
  preprint: "Preprint",
  working_paper: "Working paper",
};

export const PUBLICATION_TYPES = [
  "journal_article",
  "conference_paper",
  "book_chapter",
  "preprint",
  "thesis",
  "report",
  "other",
] as const;
export type PublicationType = (typeof PUBLICATION_TYPES)[number];
export const PUBLICATION_TYPE_LABELS: Record<PublicationType, string> = {
  journal_article: "Journal article",
  conference_paper: "Conference paper",
  book_chapter: "Book chapter",
  preprint: "Preprint",
  thesis: "Thesis",
  report: "Report",
  other: "Other",
};

export const PRESENTATION_TYPES = [
  "poster",
  "oral",
  "invited_talk",
  "keynote",
  "workshop",
  "panel",
] as const;
export type PresentationType = (typeof PRESENTATION_TYPES)[number];
export const PRESENTATION_TYPE_LABELS: Record<PresentationType, string> = {
  poster: "Poster presentation",
  oral: "Oral presentation",
  invited_talk: "Invited talk",
  keynote: "Keynote",
  workshop: "Workshop",
  panel: "Panel",
};

/** Qualitative skill levels. Never rendered as percentages. */
export const SKILL_LEVELS = ["foundational", "working", "advanced", "expert"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  foundational: "Foundational",
  working: "Working knowledge",
  advanced: "Advanced",
  expert: "Expert",
};

export const MEDIA_KINDS = ["image", "document", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const CONTACT_STATUSES = ["new", "read", "replied", "archived", "spam"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: "New",
  read: "Read",
  replied: "Replied",
  archived: "Archived",
  spam: "Spam",
};

export const NAV_LOCATIONS = ["header", "footer"] as const;
export type NavLocation = (typeof NAV_LOCATIONS)[number];

export const USER_STATUSES = ["active", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ANALYTICS_EVENT_TYPES = ["page_view", "download", "outbound_click"] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const DEVICE_CATEGORIES = ["desktop", "mobile", "tablet"] as const;
export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

/** Entity types that can be linked from analytics, search, audit logs and previews. */
export const ENTITY_TYPES = [
  "project",
  "research",
  "publication",
  "presentation",
  "blog_post",
  "credential",
  "experience",
  "education",
  "skill",
  "media",
  "page",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const SOCIAL_PLATFORMS = [
  "github",
  "linkedin",
  "email",
  "google_scholar",
  "orcid",
  "researchgate",
  "kaggle",
  "x",
  "website",
  "other",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  email: "Email",
  google_scholar: "Google Scholar",
  orcid: "ORCID",
  researchgate: "ResearchGate",
  kaggle: "Kaggle",
  x: "X",
  website: "Website",
  other: "Other",
};

/** Curated icon keys an admin can assign to skills (mapped to Lucide icons in the web app). */
export const SKILL_ICONS = [
  "code",
  "database",
  "chart",
  "sigma",
  "brain",
  "layers",
  "server",
  "terminal",
  "git",
  "notebook",
  "table",
  "flask",
  "globe",
  "container",
] as const;
export type SkillIcon = (typeof SKILL_ICONS)[number];

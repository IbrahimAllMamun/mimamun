import type { ContactStatus, ContentStatus, EntityType, UserStatus } from "../enums";
import type { Permission } from "../permissions";
import type { MediaDTO } from "./public";

/** Data transfer objects returned by `/api/auth/*` and `/api/admin/*`. */

export interface SessionUserDTO {
  id: string;
  email: string;
  name: string;
  role: { id: string; key: string; name: string };
  permissions: Permission[];
}

export interface SessionDTO {
  user: SessionUserDTO;
  csrfToken: string;
  expiresAt: string;
}

/** Row shape used by every admin list view. Extra columns are resource-specific. */
export interface AdminListItemDTO {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string | null;
  status: ContentStatus | null;
  featured: boolean | null;
  isVisible: boolean | null;
  displayOrder: number | null;
  updatedAt: string;
  extra: Record<string, string | number | boolean | null>;
}

/** An editable record: the stored input fields plus identity and timestamps. */
export type AdminRecord<T> = T & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export interface OptionDTO {
  id: string;
  label: string;
  hint: string | null;
}

export type OptionsDTO = Partial<Record<string, OptionDTO[]>>;

export interface AuditLogDTO {
  id: string;
  actor: { id: string | null; name: string | null; email: string | null };
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string | null;
  previousValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface ContactMessageDTO {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactStatus;
  notifiedAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AnalyticsSummaryDTO {
  days: number;
  enabled: boolean;
  totals: { pageViews: number; visitors: number; downloads: number; outboundClicks: number };
  previousTotals: { pageViews: number; visitors: number };
  daily: { date: string; pageViews: number; visitors: number }[];
  topPages: { path: string; views: number }[];
  referrers: { host: string; views: number }[];
  devices: { name: string; count: number }[];
  browsers: { name: string; count: number }[];
  countries: { name: string; count: number }[];
  popular: { type: EntityType; slug: string; title: string; views: number }[];
  downloads: { target: string; count: number }[];
  outbound: { target: string; count: number }[];
}

export interface IntegrationStatusDTO {
  key: string;
  label: string;
  enabled: boolean;
  configured: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
}

export interface DashboardDTO {
  counts: {
    projects: { published: number; draft: number; archived: number };
    research: { published: number; draft: number; archived: number };
    publications: { published: number; draft: number; archived: number };
    posts: { published: number; draft: number; archived: number };
    credentials: number;
    media: number;
    newMessages: number;
  };
  drafts: { id: string; type: EntityType; title: string; updatedAt: string; href: string }[];
  recentActivity: AuditLogDTO[];
  recentMessages: ContactMessageDTO[];
  analytics: AnalyticsSummaryDTO | null;
  checklist: { key: string; label: string; done: boolean; href: string }[];
  integrations: IntegrationStatusDTO[];
}

export interface MediaUsageDTO {
  entityType: string;
  entityId: string;
  label: string;
  field: string;
  href: string | null;
}

export interface AdminMediaDTO extends MediaDTO {
  originalName: string;
  checksum: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string | null;
  usage?: MediaUsageDTO[];
}

export interface AdminUserDTO {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  role: { id: string; key: string; name: string };
  lastLoginAt: string | null;
  lockedUntil: string | null;
  createdAt: string;
}

export interface RoleDTO {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
  userCount: number;
}

export interface SessionListItemDTO {
  id: string;
  user: { id: string; name: string; email: string };
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
}

export interface SystemStatusDTO {
  version: string;
  nodeVersion: string;
  environment: string;
  uptimeSeconds: number;
  memory: { rssBytes: number; heapUsedBytes: number };
  database: {
    status: "ok" | "error";
    latencyMs: number | null;
    migrationsApplied: number;
    lastMigrationAt: string | null;
    sizeBytes: number | null;
  };
  storage: { driver: string; files: number; totalBytes: number };
  mail: { configured: boolean };
  integrations: IntegrationStatusDTO[];
}

export interface AdminGithubRepoDTO {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  customDescription: string | null;
  url: string;
  primaryLanguage: string | null;
  stars: number;
  forks: number;
  isFork: boolean;
  isArchived: boolean;
  pushedAt: string | null;
  isSelected: boolean;
  displayOrder: number;
  projectId: string | null;
  lastSyncedAt: string | null;
}

export interface AdminSearchResultDTO {
  type: EntityType | "message" | "media";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

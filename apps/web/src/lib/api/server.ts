import "server-only";
import type {
  AboutDTO,
  ApiErrorBody,
  BlogPostDetailDTO,
  BlogPostSummaryDTO,
  CredentialDetailDTO,
  CredentialProviderDTO,
  ExperiencePageDTO,
  GithubSectionDTO,
  HomeDTO,
  PageMeta,
  ProjectDetailDTO,
  ProjectFacetsDTO,
  ProjectSummaryDTO,
  PublicationDTO,
  ResearchDetailDTO,
  ResearchPageDTO,
  SearchResultDTO,
  SiteDTO,
  SitemapEntryDTO,
} from "@portfolio/shared";
import { API_INTERNAL_URL, CONTENT_REVALIDATE_SECONDS } from "../env";

export type Result<T, M = undefined> =
  | { ok: true; data: T; meta: M }
  | { ok: false; status: number; error: ApiErrorBody };

const UNAVAILABLE: ApiErrorBody = {
  code: "SERVICE_UNAVAILABLE",
  message: "This content is temporarily unavailable.",
};

interface FetchOptions {
  /** Bypass the data cache (admin and preview requests). */
  noStore?: boolean;
  /** Forwarded cookie header for authenticated server-side requests. */
  cookie?: string;
}

/**
 * Server-side API access. Public reads are cached in the Next.js data cache
 * under the "content" tag (refreshed by the API's revalidation webhook, with a
 * time-based fallback). Failures resolve to a typed error — they never throw —
 * so a page can render an intentional unavailable state instead of crashing.
 */
export async function apiFetch<T, M = undefined>(path: string, options: FetchOptions = {}): Promise<Result<T, M>> {
  try {
    const response = await fetch(`${API_INTERNAL_URL}${path}`, {
      headers: { accept: "application/json", ...(options.cookie ? { cookie: options.cookie } : {}) },
      ...(options.noStore
        ? { cache: "no-store" as const }
        : { next: { revalidate: CONTENT_REVALIDATE_SECONDS, tags: ["content"] } }),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await response.json().catch(() => null)) as
      | { success: true; data: T; meta?: M }
      | { success: false; error: ApiErrorBody }
      | null;
    if (!response.ok || !body || !body.success) {
      return { ok: false, status: response.status, error: body && !body.success ? body.error : UNAVAILABLE };
    }
    return { ok: true, data: body.data, meta: body.meta as M };
  } catch {
    return { ok: false, status: 503, error: UNAVAILABLE };
  }
}

function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export type ProjectListMeta = PageMeta & { facets: ProjectFacetsDTO };
export type BlogListMeta = PageMeta & { categories: { name: string; slug: string; count: number }[] };

export const publicApi = {
  site: () => apiFetch<SiteDTO>("/api/public/site"),
  home: () => apiFetch<HomeDTO>("/api/public/home"),
  about: () => apiFetch<AboutDTO>("/api/public/about"),
  experience: () => apiFetch<ExperiencePageDTO>("/api/public/experience"),
  projects: (params: Record<string, string | number | undefined | null>) =>
    apiFetch<ProjectSummaryDTO[], ProjectListMeta>(`/api/public/projects${query(params)}`),
  project: (slug: string) => apiFetch<ProjectDetailDTO>(`/api/public/projects/${encodeURIComponent(slug)}`),
  research: () => apiFetch<ResearchPageDTO>("/api/public/research"),
  researchItem: (slug: string) => apiFetch<ResearchDetailDTO>(`/api/public/research/${encodeURIComponent(slug)}`),
  publications: () => apiFetch<PublicationDTO[]>("/api/public/publications"),
  certifications: () => apiFetch<CredentialProviderDTO[]>("/api/public/certifications"),
  credential: (slug: string) => apiFetch<CredentialDetailDTO>(`/api/public/certifications/${encodeURIComponent(slug)}`),
  blog: (params: Record<string, string | number | undefined | null>) =>
    apiFetch<BlogPostSummaryDTO[], BlogListMeta>(`/api/public/blog${query(params)}`),
  post: (slug: string) => apiFetch<BlogPostDetailDTO>(`/api/public/blog/${encodeURIComponent(slug)}`),
  github: () => apiFetch<GithubSectionDTO>("/api/public/github"),
  search: (q: string) => apiFetch<SearchResultDTO[]>(`/api/public/search${query({ q })}`),
  sitemap: () => apiFetch<SitemapEntryDTO[]>("/api/public/sitemap"),
  /** A fresh, signed timestamp for the contact form (never cached). */
  contactToken: () => apiFetch<{ token: string }>("/api/public/contact/token", { noStore: true }),
};

import { and, asc, desc, eq } from "drizzle-orm";
import type { GithubRepoDTO, GithubSectionDTO, ProjectLinkDTO } from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import { githubRepositories, integrationStatus, projects, siteSettings } from "../../database/schema";
import { iso } from "../../lib/http";
import { listed } from "./visibility";

type RepoRow = typeof githubRepositories.$inferSelect;

export function toRepoDTO(row: RepoRow, project: ProjectLinkDTO | null): GithubRepoDTO {
  const total = Object.values(row.languages).reduce((sum, bytes) => sum + bytes, 0);
  const languages = Object.entries(row.languages)
    .map(([name, bytes]) => ({ name, share: total ? bytes / total : 0 }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 5);
  return {
    id: row.id,
    name: row.name,
    fullName: row.fullName,
    description: row.customDescription ?? row.description,
    url: row.htmlUrl,
    homepage: row.homepage,
    primaryLanguage: row.primaryLanguage,
    languages,
    topics: row.topics,
    stars: row.stars,
    forks: row.forks,
    pushedAt: iso(row.pushedAt),
    project,
  };
}

/** Curated repositories from the local cache: GitHub is never called while rendering the site. */
export async function getGithubSection(db: DbExecutor): Promise<GithubSectionDTO> {
  const [[settings], rows, [status]] = await Promise.all([
    db.select({ username: siteSettings.githubUsername }).from(siteSettings).where(eq(siteSettings.id, 1)),
    db
      .select({ repo: githubRepositories, project: { slug: projects.slug, title: projects.title, type: projects.type } })
      .from(githubRepositories)
      .leftJoin(projects, and(eq(projects.id, githubRepositories.projectId), listed(projects)))
      .where(eq(githubRepositories.isSelected, true))
      .orderBy(asc(githubRepositories.displayOrder), desc(githubRepositories.pushedAt)),
    db.select().from(integrationStatus).where(eq(integrationStatus.key, "github")),
  ]);
  const username = settings?.username ?? null;
  return {
    username,
    profileUrl: username ? `https://github.com/${username}` : null,
    repositories: rows.map(({ repo, project }) => toRepoDTO(repo, project?.slug ? project : null)),
    lastSyncedAt: iso(status?.lastSuccessAt ?? null),
  };
}

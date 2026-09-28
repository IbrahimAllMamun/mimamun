import { and, eq, notInArray } from "drizzle-orm";
import type { Database } from "../../database/client";
import { githubRepositories, integrationStatus, siteSettings } from "../../database/schema";
import type { Logger } from "../../lib/logger";
import type { GithubClient } from "./client";

export interface SyncResult {
  repositories: number;
  languagesUpdated: number;
}

async function markStatus(db: Database, patch: Partial<typeof integrationStatus.$inferInsert>) {
  await db
    .insert(integrationStatus)
    .values({ key: "github", ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: integrationStatus.key,
      set: { ...patch, updatedAt: new Date() },
    });
}

/**
 * Refreshes cached repository metadata. Curation fields (selection, order,
 * custom description, linked project) are never overwritten. On failure the
 * cached rows stay untouched and the error is recorded for the admin.
 */
export async function syncGithubRepositories(
  db: Database,
  client: GithubClient,
  logger: Logger,
): Promise<SyncResult> {
  const [settings] = await db
    .select({ username: siteSettings.githubUsername })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1));
  const username = settings?.username;
  if (!username) throw new Error("Set a GitHub username in Site settings before syncing.");
  const startedAt = new Date();
  await markStatus(db, { lastRunAt: startedAt });
  try {
    const repos = await client.listRepositories(username);
    const now = new Date();
    for (const repo of repos) {
      const values = {
        githubId: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        htmlUrl: repo.html_url,
        homepage: repo.homepage || null,
        primaryLanguage: repo.language,
        topics: repo.topics ?? [],
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        isFork: repo.fork,
        isArchived: repo.archived,
        pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
        lastSyncedAt: now,
      };
      const { githubId: _githubId, ...updatable } = values;
      await db
        .insert(githubRepositories)
        .values(values)
        .onConflictDoUpdate({ target: githubRepositories.githubId, set: updatable });
    }
    const seenIds = repos.map((repo) => repo.id);
    // Repositories that disappeared are dropped unless the owner chose to show them.
    await db
      .delete(githubRepositories)
      .where(
        and(
          eq(githubRepositories.isSelected, false),
          seenIds.length ? notInArray(githubRepositories.githubId, seenIds) : undefined,
        ),
      );

    let languagesUpdated = 0;
    const selected = await db
      .select()
      .from(githubRepositories)
      .where(eq(githubRepositories.isSelected, true));
    for (const repo of selected) {
      try {
        const languages = await client.getLanguages(repo.fullName);
        await db
          .update(githubRepositories)
          .set({ languages })
          .where(eq(githubRepositories.id, repo.id));
        languagesUpdated += 1;
      } catch (error) {
        logger.warn({ err: error, repo: repo.fullName }, "github languages fetch failed");
      }
    }
    await markStatus(db, {
      lastSuccessAt: new Date(),
      lastError: null,
      meta: { repositories: repos.length, selected: selected.length },
    });
    return { repositories: repos.length, languagesUpdated };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
    await markStatus(db, { lastErrorAt: new Date(), lastError: message });
    logger.warn({ err: error }, "github sync failed; keeping cached repositories");
    throw error;
  }
}

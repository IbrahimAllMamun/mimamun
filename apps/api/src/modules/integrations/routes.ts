import { Router } from "express";
import { asc, desc, eq } from "drizzle-orm";
import {
  githubRepositoryUpdateInput,
  PERMISSIONS,
  type AdminGithubRepoDTO,
} from "@portfolio/shared";
import { githubRepositories, integrationStatus, siteSettings } from "../../database/schema";
import { syncGithubRepositories } from "../../integrations/github/sync";
import { requirePermission } from "../../middleware/auth";
import { AppError, notFound } from "../../lib/errors";
import { iso, ok, parse } from "../../lib/http";
import { UUID_PATTERN } from "../../lib/resource";
import type { AppDeps } from "../../types";
import { recordAudit } from "../audit/service";

function toAdminRepo(row: typeof githubRepositories.$inferSelect): AdminGithubRepoDTO {
  return {
    id: row.id,
    name: row.name,
    fullName: row.fullName,
    description: row.description,
    customDescription: row.customDescription,
    url: row.htmlUrl,
    primaryLanguage: row.primaryLanguage,
    stars: row.stars,
    forks: row.forks,
    isFork: row.isFork,
    isArchived: row.isArchived,
    pushedAt: iso(row.pushedAt),
    isSelected: row.isSelected,
    displayOrder: row.displayOrder,
    projectId: row.projectId,
    lastSyncedAt: iso(row.lastSyncedAt),
  };
}

export function integrationsRouter(deps: AppDeps): Router {
  const router = Router();
  const { db } = deps;
  router.use(requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE));

  router.get("/github", async (_req, res) => {
    const [[settings], [status], repos] = await Promise.all([
      db.select().from(siteSettings).where(eq(siteSettings.id, 1)),
      db.select().from(integrationStatus).where(eq(integrationStatus.key, "github")),
      db
        .select()
        .from(githubRepositories)
        .orderBy(
          desc(githubRepositories.isSelected),
          asc(githubRepositories.displayOrder),
          desc(githubRepositories.pushedAt),
        ),
    ]);
    ok(res, {
      username: settings?.githubUsername ?? null,
      syncEnabled: settings?.githubSyncEnabled ?? false,
      tokenConfigured: Boolean(deps.config.github.token),
      status: {
        lastRunAt: iso(status?.lastRunAt ?? null),
        lastSuccessAt: iso(status?.lastSuccessAt ?? null),
        lastErrorAt: iso(status?.lastErrorAt ?? null),
        lastError: status?.lastError ?? null,
      },
      repositories: repos.map(toAdminRepo),
    });
  });

  router.post("/github/sync", async (req, res) => {
    try {
      const result = await syncGithubRepositories(db, deps.github, deps.logger);
      await recordAudit(db, req, {
        action: "integration.github_sync",
        entityType: "integration",
        entityId: "github",
        summary: `Synced ${result.repositories} GitHub repositories`,
      });
      deps.revalidator.contentChanged("github:sync");
      ok(res, result);
    } catch (error) {
      throw new AppError(
        502,
        "SERVICE_UNAVAILABLE",
        `GitHub sync failed: ${error instanceof Error ? error.message : "unknown error"}. The site keeps showing the last synced data.`,
      );
    }
  });

  router.patch("/github/repositories/:id", async (req, res) => {
    const id = String(req.params.id);
    if (!UUID_PATTERN.test(id)) throw notFound("Repository");
    const input = parse(githubRepositoryUpdateInput, req.body);
    const [row] = await db
      .update(githubRepositories)
      .set(input)
      .where(eq(githubRepositories.id, id))
      .returning();
    if (!row) throw notFound("Repository");
    await recordAudit(db, req, {
      action: "integration.github_curate",
      entityType: "github_repository",
      entityId: id,
      summary: `${input.isSelected ? "Showing" : "Hiding"} repository ${row.fullName}`,
      after: input,
    });
    deps.revalidator.contentChanged("github:curate");
    ok(res, toAdminRepo(row));
  });

  return router;
}

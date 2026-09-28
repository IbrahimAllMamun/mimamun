import { eq, lt, or, isNotNull } from "drizzle-orm";
import { passwordResetTokens, siteSettings } from "../database/schema";
import { syncGithubRepositories } from "../integrations/github/sync";
import { purgeAnalytics } from "../modules/analytics/service";
import { purgeSessions } from "../modules/auth/sessions";
import type { AppDeps } from "../types";

interface Job {
  name: string;
  intervalMs: number;
  run: () => Promise<void>;
}

/**
 * Minimal in-process scheduler for housekeeping. Jobs never overlap with
 * themselves and failures are logged, never thrown. For multiple API
 * instances, enable jobs on one instance only (JOBS_ENABLED=false elsewhere).
 */
export function startScheduler(deps: AppDeps): () => void {
  const { db, logger } = deps;
  const hour = 3_600_000;
  const jobs: Job[] = [
    {
      name: "maintenance",
      intervalMs: 24 * hour,
      run: async () => {
        const [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
        const events = await purgeAnalytics(db, settings?.analyticsRetentionDays ?? 395);
        const sessionCount = await purgeSessions(db);
        const weekAgo = new Date(Date.now() - 7 * 24 * hour);
        await db
          .delete(passwordResetTokens)
          .where(
            or(lt(passwordResetTokens.expiresAt, weekAgo), isNotNull(passwordResetTokens.usedAt)),
          );
        logger.info({ events, sessions: sessionCount }, "maintenance completed");
      },
    },
    {
      name: "github-sync",
      intervalMs: deps.config.github.syncIntervalMinutes * 60_000,
      run: async () => {
        const [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
        if (!settings?.githubSyncEnabled || !settings.githubUsername) return;
        await syncGithubRepositories(db, deps.github, logger);
        deps.revalidator.contentChanged("github:scheduled-sync");
      },
    },
  ];

  const timers: NodeJS.Timeout[] = [];
  let stopped = false;
  for (const job of jobs) {
    let running = false;
    const tick = async () => {
      if (running || stopped) return;
      running = true;
      try {
        await job.run();
      } catch (error) {
        logger.warn({ err: error, job: job.name }, "scheduled job failed");
      } finally {
        running = false;
      }
    };
    // First run shortly after start-up, then on the interval.
    const initial = setTimeout(() => void tick(), 30_000);
    const interval = setInterval(() => void tick(), job.intervalMs);
    initial.unref();
    interval.unref();
    timers.push(initial, interval);
  }
  return () => {
    stopped = true;
    for (const timer of timers) clearTimeout(timer);
  };
}

import { mkdir } from "node:fs/promises";
import { createApp } from "./app";
import { loadConfig } from "./config/env";
import { createDatabase } from "./database/client";
import { HttpGithubClient } from "./integrations/github/client";
import { createMailer } from "./integrations/mailer";
import { HttpRevalidator, NoopRevalidator } from "./integrations/revalidator";
import { LocalStorage } from "./integrations/storage";
import { startScheduler } from "./jobs/scheduler";
import { createLogger } from "./lib/logger";
import type { AppDeps } from "./types";

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel, !config.isProduction && process.stdout.isTTY);
  const database = createDatabase(config.database);
  await mkdir(config.uploads.dir, { recursive: true });

  const deps: AppDeps = {
    config,
    db: database.db,
    pool: database.pool,
    logger,
    storage: new LocalStorage(config.uploads.dir),
    mailer: createMailer(config.mail, logger),
    revalidator:
      config.web.internalUrl && config.web.revalidateSecret
        ? new HttpRevalidator(config.web.internalUrl, config.web.revalidateSecret, logger)
        : new NoopRevalidator(),
    github: new HttpGithubClient(config.github.apiUrl, config.github.token),
    startedAt: new Date(),
  };

  database.pool.on("error", (error) => logger.error({ err: error }, "idle database client error"));

  const app = createApp(deps);
  const server = app.listen(config.port, config.host, () => {
    logger.info({ port: config.port, env: config.env, version: config.version }, "api listening");
  });
  // Slow clients must not hold sockets forever.
  server.headersTimeout = 20_000;
  server.requestTimeout = 120_000;
  server.keepAliveTimeout = 65_000;

  const stopJobs = config.jobsEnabled ? startScheduler(deps) : () => undefined;

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");
    stopJobs();
    server.close(async () => {
      await deps.revalidator.flush().catch(() => undefined);
      await database.close();
      logger.info("shutdown complete");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 15_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "unhandled rejection"));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

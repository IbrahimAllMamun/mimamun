import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { loadConfig } from "../config/env";
import { createDatabase } from "./client";
import { runMigrations } from "./migrate";
import { adminFromEnv, seed } from "./seed/index";

/** Drops every table, re-applies migrations and seeds. Development and test only. */
async function main() {
  const config = loadConfig();
  if (config.isProduction) {
    throw new Error("db:reset is disabled when NODE_ENV=production");
  }
  const handle = createDatabase({ ...config.database, poolMax: 2 });
  try {
    await handle.db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await handle.db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await handle.db.execute(sql`CREATE SCHEMA public`);
    await runMigrations(handle);
    await seed(handle.db, {
      log: (message) => console.log(`seed: ${message}`),
      admin: adminFromEnv(process.env, config.isProduction),
    });
    console.log("Database reset complete.");
  } finally {
    await handle.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error("Reset failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

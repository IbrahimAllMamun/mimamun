import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { loadConfig } from "../config/env";
import { createDatabase, type DatabaseHandle } from "./client";

/** Arbitrary constant used for a session-level advisory lock so two migrators never overlap. */
const MIGRATION_LOCK_ID = 7_341_902_115;

export function migrationsFolder(): string {
  if (process.env.MIGRATIONS_DIR) return path.resolve(process.env.MIGRATIONS_DIR);
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");
}

export async function runMigrations(
  handle: Pick<DatabaseHandle, "db" | "pool">,
  folder = migrationsFolder(),
): Promise<void> {
  // Session-level lock held on a dedicated connection for the whole run.
  const lockClient = await handle.pool.connect();
  try {
    await lockClient.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    try {
      await migrate(handle.db, { migrationsFolder: folder });
    } finally {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
    }
  } finally {
    lockClient.release();
  }
}

async function main() {
  const config = loadConfig();
  const handle = createDatabase({ ...config.database, poolMax: 2 });
  try {
    await runMigrations(handle);
    console.log("Migrations applied.");
  } finally {
    await handle.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error("Migration failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

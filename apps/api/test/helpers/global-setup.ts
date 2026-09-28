import { sql } from "drizzle-orm";
import { createDatabase } from "../../src/database/client";
import { runMigrations } from "../../src/database/migrate";
import { TEST_DATABASE_URL } from "./env";

/** Recreates the test schema once per run and applies every migration. */
export default async function setup() {
  const handle = createDatabase({ url: TEST_DATABASE_URL, poolMax: 2, ssl: "disable" });
  try {
    await handle.db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await handle.db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await handle.db.execute(sql`CREATE SCHEMA public`);
    await runMigrations(handle);
  } finally {
    await handle.close();
  }
}

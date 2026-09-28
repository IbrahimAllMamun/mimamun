import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { AppConfig } from "../config/env";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
/** A database handle or an open transaction — services accept either. */
export type DbExecutor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface DatabaseHandle {
  db: Database;
  pool: pg.Pool;
  close: () => Promise<void>;
}

export function createDatabase(config: AppConfig["database"]): DatabaseHandle {
  const pool = new pg.Pool({
    connectionString: config.url,
    max: config.poolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Guard against runaway queries holding connections.
    statement_timeout: 15_000,
    application_name: "portfolio-api",
    ssl: config.ssl === "disable" ? undefined : { rejectUnauthorized: config.ssl === "require" },
  });
  const db = drizzle({ client: pool, schema, casing: "snake_case" });
  return {
    db,
    pool,
    close: () => pool.end(),
  };
}

export { schema };

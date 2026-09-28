import { Router } from "express";
import { count, sql } from "drizzle-orm";
import { PERMISSIONS, type SystemStatusDTO } from "@portfolio/shared";
import { integrationStatus, media } from "../../database/schema";
import { requirePermission } from "../../middleware/auth";
import { iso, ok } from "../../lib/http";
import type { AppDeps } from "../../types";

/** Internal diagnostics for administrators only (never exposed publicly). */
export function systemRouter(deps: AppDeps): Router {
  const router = Router();
  router.get("/", requirePermission(PERMISSIONS.SYSTEM_READ), async (_req, res) => {
    const started = performance.now();
    let database: SystemStatusDTO["database"];
    try {
      await deps.db.execute(sql`SELECT 1`);
      const latencyMs = Math.round(performance.now() - started);
      const migrations = await deps.db.execute<{ total: number; last: string | null }>(
        sql`SELECT count(*)::int AS total, max(created_at)::text AS last FROM drizzle.__drizzle_migrations`,
      );
      const size = await deps.db.execute<{ size: string }>(
        sql`SELECT pg_database_size(current_database())::text AS size`,
      );
      const last = migrations.rows[0]?.last;
      database = {
        status: "ok",
        latencyMs,
        migrationsApplied: migrations.rows[0]?.total ?? 0,
        lastMigrationAt: last ? new Date(Number(last)).toISOString() : null,
        sizeBytes: Number(size.rows[0]?.size ?? 0),
      };
    } catch {
      database = {
        status: "error",
        latencyMs: null,
        migrationsApplied: 0,
        lastMigrationAt: null,
        sizeBytes: null,
      };
    }
    const [[files], statuses] = await Promise.all([
      deps.db
        .select({
          value: count(),
          bytes: sql<number>`coalesce(sum(${media.sizeBytes}), 0)::bigint`,
        })
        .from(media),
      deps.db.select().from(integrationStatus),
    ]);
    const memory = process.memoryUsage();
    const dto: SystemStatusDTO = {
      version: deps.config.version,
      nodeVersion: process.version,
      environment: deps.config.env,
      uptimeSeconds: Math.round((Date.now() - deps.startedAt.getTime()) / 1000),
      memory: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed },
      database,
      storage: {
        driver: deps.storage.name,
        files: files?.value ?? 0,
        totalBytes: Number(files?.bytes ?? 0),
      },
      mail: { configured: deps.mailer.configured },
      integrations: statuses.map((status) => ({
        key: status.key,
        label: status.key === "github" ? "GitHub" : status.key,
        enabled: true,
        configured: true,
        lastRunAt: iso(status.lastRunAt),
        lastSuccessAt: iso(status.lastSuccessAt),
        lastErrorAt: iso(status.lastErrorAt),
        lastError: status.lastError,
      })),
    };
    ok(res, dto);
  });
  return router;
}

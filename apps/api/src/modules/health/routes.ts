import { Router } from "express";
import { sql } from "drizzle-orm";
import type { AppDeps } from "../../types";

/**
 * Liveness and readiness probes. Deliberately minimal: no versions, hostnames
 * or error details are exposed publicly (see /api/admin/system for that).
 */
export function healthRouter(deps: Pick<AppDeps, "db">): Router {
  const router = Router();
  router.get("/", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, data: { status: "ok" } });
  });
  router.get("/db", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const started = performance.now();
    try {
      await deps.db.execute(sql`SELECT 1`);
      res.json({ success: true, data: { status: "ok", latencyMs: Math.round(performance.now() - started) } });
    } catch {
      res.status(503).json({
        success: false,
        error: { code: "SERVICE_UNAVAILABLE", message: "Database unavailable" },
      });
    }
  });
  return router;
}

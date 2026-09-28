import { Router } from "express";
import { eq } from "drizzle-orm";
import { analyticsEventInput, analyticsSummaryQuery, PERMISSIONS } from "@portfolio/shared";
import { siteSettings } from "../../database/schema";
import { requirePermission } from "../../middleware/auth";
import { createRateLimit, minutes } from "../../middleware/rate-limit";
import { noContent, ok, parse } from "../../lib/http";
import type { AppDeps } from "../../types";
import { analyticsSummary, recordEvent, shouldTrack } from "./service";

async function analyticsEnabled(deps: Pick<AppDeps, "db">): Promise<boolean> {
  const [row] = await deps.db
    .select({ enabled: siteSettings.analyticsEnabled })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1));
  return row?.enabled ?? false;
}

/** POST /api/analytics/events — anonymous, cookie-less event ingestion. */
export function analyticsIngestRouter(deps: AppDeps): Router {
  const router = Router();
  const limit = createRateLimit({ windowMs: minutes(1), limit: 60, message: "Too many events" });
  router.post("/events", limit, async (req, res) => {
    // Opted-out visitors, bots and disabled analytics all get the same empty response.
    if (!shouldTrack(req) || !(await analyticsEnabled(deps))) {
      noContent(res);
      return;
    }
    const input = parse(analyticsEventInput, req.body);
    await recordEvent(deps.db, deps.config, req, input);
    noContent(res);
  });
  return router;
}

export function analyticsAdminRouter(deps: AppDeps): Router {
  const router = Router();
  router.get("/summary", requirePermission(PERMISSIONS.ANALYTICS_READ), async (req, res) => {
    const query = parse(analyticsSummaryQuery, req.query);
    ok(res, await analyticsSummary(deps.db, query.days, await analyticsEnabled(deps)));
  });
  return router;
}

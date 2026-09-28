import { Router } from "express";
import { auditListQuery, pageMeta, PERMISSIONS } from "@portfolio/shared";
import { requirePermission } from "../../middleware/auth";
import { ok, parse } from "../../lib/http";
import type { AppDeps } from "../../types";
import { listAuditLogs } from "./service";

export function auditRouter(deps: AppDeps): Router {
  const router = Router();
  router.get("/", requirePermission(PERMISSIONS.AUDIT_READ), async (req, res) => {
    const query = parse(auditListQuery, req.query);
    const { items, total } = await listAuditLogs(deps.db, query);
    ok(res, items, pageMeta(query.page, query.pageSize, total));
  });
  return router;
}

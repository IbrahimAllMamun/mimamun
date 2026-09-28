import { Router } from "express";
import { PERMISSIONS } from "@portfolio/shared";
import { requirePermission } from "../../middleware/auth";
import { notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { UUID_PATTERN } from "../../lib/resource";
import type { AppDeps } from "../../types";
import { getPostDetail } from "../public/blog";
import { getProjectDetail } from "../public/projects";
import { getResearchDetail } from "../public/research";

/** Unpublished content rendered through the same builders as the public site. */
export function previewRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requirePermission(PERMISSIONS.CONTENT_READ));
  const idOf = (value: unknown) => {
    const id = String(value ?? "");
    if (!UUID_PATTERN.test(id)) throw notFound("Content");
    return id;
  };
  router.get("/projects/:id", async (req, res) => {
    const item = await getProjectDetail(deps.db, { id: idOf(req.params.id) }, true);
    if (!item) throw notFound("Project");
    ok(res, item);
  });
  router.get("/research/:id", async (req, res) => {
    const item = await getResearchDetail(deps.db, { id: idOf(req.params.id) }, true);
    if (!item) throw notFound("Research");
    ok(res, item);
  });
  router.get("/blog-posts/:id", async (req, res) => {
    const item = await getPostDetail(deps.db, { id: idOf(req.params.id) }, true);
    if (!item) throw notFound("Post");
    ok(res, item);
  });
  return router;
}

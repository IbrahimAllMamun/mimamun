import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { ResourceService, resourceRouter, type ResourceDefinition } from "../lib/resource";
import type { AppDeps } from "../types";
import { analyticsAdminRouter } from "./analytics/routes";
import { auditRouter } from "./audit/routes";
import { blogCategoryResource, blogPostResource } from "./blog/resources";
import { educationResource, experienceResource } from "./career/resources";
import { contactAdminRouter } from "./contact/routes";
import {
  credentialProviderResource,
  credentialResource,
  credentialTypeResource,
} from "./credentials/resources";
import { dashboardRouter } from "./dashboard/routes";
import { integrationsRouter } from "./integrations/routes";
import { mediaRouter } from "./media/routes";
import { optionsRouter } from "./options/routes";
import { previewRouter } from "./preview/routes";
import { projectCategoryResource, projectResource, tagResource } from "./projects/resources";
import { presentationResource, publicationResource, researchResource } from "./research/resources";
import { adminSearchRouter } from "./search/routes";
import {
  approachStepResource,
  focusAreaResource,
  navigationResource,
  socialLinkResource,
} from "./site/resources";
import { siteAdminRouter } from "./site/routes";
import { skillCategoryResource, skillResource } from "./skills/resources";
import { systemRouter } from "./system/routes";
import { usersRouter } from "./users/routes";

/** Every CMS collection exposed under /api/admin/{path}. */
export const RESOURCES = [
  socialLinkResource,
  focusAreaResource,
  approachStepResource,
  navigationResource,
  experienceResource,
  educationResource,
  projectCategoryResource,
  tagResource,
  projectResource,
  researchResource,
  publicationResource,
  presentationResource,
  skillCategoryResource,
  skillResource,
  credentialProviderResource,
  credentialTypeResource,
  credentialResource,
  blogCategoryResource,
  blogPostResource,
] as unknown as ResourceDefinition<Record<string, unknown>>[];

export function adminRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireAuth);
  router.use("/dashboard", dashboardRouter(deps));
  router.use("/search", adminSearchRouter(deps));
  router.use("/options", optionsRouter(deps));
  router.use("/preview", previewRouter(deps));
  router.use("/media", mediaRouter(deps));
  router.use("/messages", contactAdminRouter(deps));
  router.use("/analytics", analyticsAdminRouter(deps));
  router.use("/integrations", integrationsRouter(deps));
  router.use("/system", systemRouter(deps));
  router.use("/audit-logs", auditRouter(deps));
  router.use(siteAdminRouter(deps));
  router.use(usersRouter(deps));
  for (const definition of RESOURCES) {
    router.use(`/${definition.path}`, resourceRouter(new ResourceService(definition, deps)));
  }
  return router;
}

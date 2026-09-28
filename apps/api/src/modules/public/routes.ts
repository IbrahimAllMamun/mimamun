import { Router, type Response } from "express";
import { eq } from "drizzle-orm";
import { pageMeta, publicBlogQuery, publicProjectQuery, searchQueryInput } from "@portfolio/shared";
import { media, profile, siteSettings } from "../../database/schema";
import { notFound } from "../../lib/errors";
import { ok, parse } from "../../lib/http";
import type { AppDeps } from "../../types";
import { recordEvent, shouldTrack } from "../analytics/service";
import { mediaUrl } from "../media/mapper";
import { getPostDetail, listPublicPosts } from "./blog";
import { getGithubSection } from "./github";
import { getAbout, getExperiencePage, getHome, getResearchPage } from "./pages";
import { getProjectDetail, listPublicProjects } from "./projects";
import { getResearchDetail, listPublishedPublications } from "./research";
import { searchPublic } from "./search";
import { getSite } from "./site";
import { getSitemap } from "./sitemap";
import { getCredentialDetail, getCredentialTree } from "./taxonomies";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function cacheable(res: Response) {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
}

function slugParam(value: unknown, label: string): string {
  const slug = String(value ?? "");
  if (!SLUG.test(slug) || slug.length > 160) throw notFound(label);
  return slug;
}

/** Read-only endpoints for the public website. Only published, public content is returned. */
export function publicRouter(deps: AppDeps): Router {
  const router = Router();
  const { db } = deps;

  router.get("/site", async (_req, res) => {
    const site = await getSite(db);
    if (!site) throw notFound("Site");
    cacheable(res);
    ok(res, site);
  });

  router.get("/home", async (_req, res) => {
    cacheable(res);
    ok(res, await getHome(db));
  });

  router.get("/about", async (_req, res) => {
    cacheable(res);
    ok(res, await getAbout(db));
  });

  router.get("/experience", async (_req, res) => {
    cacheable(res);
    ok(res, await getExperiencePage(db));
  });

  router.get("/projects", async (req, res) => {
    const query = parse(publicProjectQuery, req.query);
    const { items, total, facets } = await listPublicProjects(db, query);
    cacheable(res);
    ok(res, items, { ...pageMeta(query.page, query.pageSize, total), facets });
  });

  router.get("/projects/:slug", async (req, res) => {
    const project = await getProjectDetail(db, { slug: slugParam(req.params.slug, "Project") });
    if (!project) throw notFound("Project");
    cacheable(res);
    ok(res, project);
  });

  router.get("/research", async (_req, res) => {
    cacheable(res);
    ok(res, await getResearchPage(db));
  });

  router.get("/research/:slug", async (req, res) => {
    const item = await getResearchDetail(db, { slug: slugParam(req.params.slug, "Research") });
    if (!item) throw notFound("Research");
    cacheable(res);
    ok(res, item);
  });

  router.get("/publications", async (_req, res) => {
    cacheable(res);
    ok(res, await listPublishedPublications(db));
  });

  router.get("/certifications", async (_req, res) => {
    cacheable(res);
    ok(res, await getCredentialTree(db));
  });

  router.get("/certifications/:slug", async (req, res) => {
    const credential = await getCredentialDetail(db, slugParam(req.params.slug, "Credential"));
    if (!credential) throw notFound("Credential");
    cacheable(res);
    ok(res, credential);
  });

  router.get("/blog", async (req, res) => {
    const query = parse(publicBlogQuery, req.query);
    const { items, total, categories } = await listPublicPosts(db, query);
    cacheable(res);
    ok(res, items, { ...pageMeta(query.page, query.pageSize, total), categories });
  });

  router.get("/blog/:slug", async (req, res) => {
    const post = await getPostDetail(db, { slug: slugParam(req.params.slug, "Post") });
    if (!post) throw notFound("Post");
    cacheable(res);
    ok(res, post);
  });

  router.get("/github", async (_req, res) => {
    cacheable(res);
    ok(res, await getGithubSection(db));
  });

  router.get("/search", async (req, res) => {
    const { q } = parse(searchQueryInput, req.query, "Enter something to search for");
    cacheable(res);
    ok(res, await searchPublic(db, q));
  });

  router.get("/sitemap", async (_req, res) => {
    cacheable(res);
    ok(res, await getSitemap(db));
  });

  return router;
}

/**
 * GET /cv — downloads the current CV (tracked server-side as a download).
 * When no CV has been uploaded the visitor is sent to the contact page instead.
 */
export function cvRouter(deps: AppDeps): Router {
  const router = Router();
  router.get("/", async (req, res) => {
    const [row] = await deps.db
      .select({ storageKey: media.storageKey })
      .from(profile)
      .innerJoin(media, eq(media.id, profile.cvMediaId));
    res.setHeader("Cache-Control", "no-store");
    if (!row) {
      res.redirect(302, "/contact?topic=cv");
      return;
    }
    const [settings] = await deps.db
      .select({ enabled: siteSettings.analyticsEnabled })
      .from(siteSettings);
    if (settings?.enabled && shouldTrack(req)) {
      try {
        await recordEvent(deps.db, deps.config, req, {
          type: "download",
          path: "/cv",
          target: "/cv",
        });
      } catch (error) {
        deps.logger.warn({ err: error }, "could not record CV download");
      }
    }
    res.redirect(302, `${mediaUrl(row.storageKey)}?download=1`);
  });
  return router;
}

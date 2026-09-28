import { Router } from "express";
import { asc, sql } from "drizzle-orm";
import { PERMISSIONS, type OptionDTO, type OptionsDTO } from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import {
  blogCategories,
  credentialProviders,
  credentials,
  credentialTypes,
  education,
  projectCategories,
  projects,
  publications,
  research,
  roles,
  skillCategories,
  skills,
} from "../../database/schema";
import { requirePermission } from "../../middleware/auth";
import { ok } from "../../lib/http";
import type { AppDeps } from "../../types";

type Loader = (db: DbExecutor) => Promise<OptionDTO[]>;

const option = (id: string, label: string, hint: string | null = null): OptionDTO => ({
  id,
  label,
  hint,
});

/** Lightweight id/label lists that feed pickers in the admin forms. */
const LOADERS: Record<string, Loader> = {
  projects: async (db) =>
    (
      await db
        .select({ id: projects.id, title: projects.title, status: projects.status })
        .from(projects)
        .orderBy(asc(projects.title))
    ).map((row) => option(row.id, row.title, row.status)),
  research: async (db) =>
    (
      await db
        .select({ id: research.id, title: research.title, status: research.status })
        .from(research)
        .orderBy(asc(research.title))
    ).map((row) => option(row.id, row.title, row.status)),
  publications: async (db) =>
    (
      await db
        .select({ id: publications.id, title: publications.title })
        .from(publications)
        .orderBy(asc(publications.title))
    ).map((row) => option(row.id, row.title)),
  education: async (db) =>
    (await db.select().from(education).orderBy(asc(education.displayOrder))).map((row) =>
      option(row.id, [row.degree, row.fieldOfStudy].filter(Boolean).join(" in "), row.institution),
    ),
  "project-categories": async (db) =>
    (await db.select().from(projectCategories).orderBy(asc(projectCategories.displayOrder))).map(
      (row) => option(row.id, row.name),
    ),
  "blog-categories": async (db) =>
    (await db.select().from(blogCategories).orderBy(asc(blogCategories.displayOrder))).map((row) =>
      option(row.id, row.name),
    ),
  "skill-categories": async (db) => {
    const rows = await db
      .select()
      .from(skillCategories)
      .orderBy(asc(skillCategories.displayOrder), asc(skillCategories.name));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const path = (id: string | null): string[] => {
      const row = id ? byId.get(id) : undefined;
      return row ? [...path(row.parentId), row.name] : [];
    };
    return rows.map((row) => option(row.id, path(row.id).join(" › ")));
  },
  skills: async (db) =>
    (
      await db
        .select({ id: skills.id, name: skills.name, category: skillCategories.name })
        .from(skills)
        .innerJoin(skillCategories, sql`${skillCategories.id} = ${skills.categoryId}`)
        .orderBy(asc(skills.name))
    ).map((row) => option(row.id, row.name, row.category)),
  "credential-providers": async (db) =>
    (
      await db.select().from(credentialProviders).orderBy(asc(credentialProviders.displayOrder))
    ).map((row) => option(row.id, row.name)),
  "credential-types": async (db) =>
    (await db.select().from(credentialTypes).orderBy(asc(credentialTypes.displayOrder))).map(
      (row) => option(row.id, row.name),
    ),
  credentials: async (db) =>
    (
      await db
        .select({
          id: credentials.id,
          title: credentials.title,
          provider: credentialProviders.name,
          providerId: credentials.providerId,
        })
        .from(credentials)
        .innerJoin(credentialProviders, sql`${credentialProviders.id} = ${credentials.providerId}`)
        .orderBy(asc(credentialProviders.name), asc(credentials.title))
    ).map((row) => option(row.id, row.title, `${row.provider}|${row.providerId}`)),
  roles: async (db) =>
    (await db.select().from(roles).orderBy(asc(roles.name))).map((row) =>
      option(row.id, row.name, row.key),
    ),
};

export function optionsRouter(deps: AppDeps): Router {
  const router = Router();
  router.get("/", requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
    const requested = String(req.query.types ?? "")
      .split(",")
      .map((type) => type.trim())
      .filter((type) => type in LOADERS);
    const entries = await Promise.all(
      requested.map(async (type) => [type, await LOADERS[type]!(deps.db)] as const),
    );
    const result: OptionsDTO = Object.fromEntries(entries);
    ok(res, result);
  });
  return router;
}

import { asc, eq, sql } from "drizzle-orm";
import {
  SKILL_LEVEL_LABELS,
  skillCategoryInput,
  skillInput,
  type SkillCategoryInput,
  type SkillInput,
  type SkillLevel,
} from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import { skillCategories, skillProjects, skills } from "../../database/schema";
import { loadLinks, syncLinks } from "../../lib/content";
import { badRequest, conflict } from "../../lib/errors";
import { defineResource, listItem, UUID_PATTERN } from "../../lib/resource";

/** Rejects a parent that is the category itself or one of its descendants. */
async function assertNoCategoryCycle(db: DbExecutor, id: string, parentId: string | null) {
  if (!parentId) return;
  if (parentId === id) throw badRequest("A category cannot be its own parent", [{ path: "parentId", message: "Choose another parent" }]);
  const result = await db.execute<{ id: string }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM skill_categories WHERE id = ${parentId}
      UNION ALL
      SELECT c.id, c.parent_id FROM skill_categories c JOIN ancestors a ON c.id = a.parent_id
    )
    SELECT id FROM ancestors WHERE id = ${id} LIMIT 1`);
  if (result.rows.length) {
    throw badRequest("A category cannot be moved inside one of its own sub-categories", [
      { path: "parentId", message: "This would create a loop" },
    ]);
  }
}

export const skillCategoryResource = defineResource<SkillCategoryInput>({
  path: "skill-categories",
  entityType: "skill_category",
  label: "Skill category",
  table: skillCategories,
  input: skillCategoryInput,
  slugSource: "name",
  searchColumns: ["name", "description"],
  defaultSort: [asc(skillCategories.displayOrder), asc(skillCategories.name)],
  filters: (query) => (query.parent === "root" ? [sql`${skillCategories.parentId} IS NULL`] : []),
  listItem: (row) => listItem(row, { title: String(row.name), subtitle: (row.description as string | null) ?? null, extra: { parentId: (row.parentId as string | null) ?? null } }),
  validate: async (db, input, existing) => {
    if (existing) await assertNoCategoryCycle(db, existing.id, input.parentId);
  },
  beforeDelete: async (db, row) => {
    const [child] = await db.select({ id: skillCategories.id }).from(skillCategories).where(eq(skillCategories.parentId, row.id)).limit(1);
    const [skill] = await db.select({ id: skills.id }).from(skills).where(eq(skills.categoryId, row.id)).limit(1);
    if (child || skill) throw conflict("Move or delete this category's sub-categories and skills first");
  },
});

export const skillResource = defineResource<SkillInput>({
  path: "skills",
  entityType: "skill",
  label: "Skill",
  table: skills,
  input: skillInput,
  slugSource: "name",
  slugScope: (input) => eq(skills.categoryId, input.categoryId),
  searchColumns: ["name", "description"],
  defaultSort: [asc(skills.categoryId), asc(skills.displayOrder), asc(skills.name)],
  filters: (query) => (query.parent && UUID_PATTERN.test(query.parent) ? [eq(skills.categoryId, query.parent)] : []),
  relationKeys: ["projectIds"],
  listItem: (row) =>
    listItem(row, {
      title: String(row.name),
      subtitle: row.level ? SKILL_LEVEL_LABELS[row.level as SkillLevel] : null,
      extra: { categoryId: String(row.categoryId) },
    }),
  loadRelations: async (db, ids) => {
    const links = await loadLinks(db, skillProjects, "skillId", ids, "projectId");
    return new Map(ids.map((id) => [id, { projectIds: links.get(id) ?? [] }]));
  },
  saveRelations: (tx, id, input) => syncLinks(tx, skillProjects, "skillId", id, "projectId", input.projectIds),
});


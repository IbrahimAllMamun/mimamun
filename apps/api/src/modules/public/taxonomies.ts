import { and, asc, eq } from "drizzle-orm";
import type {
  CredentialDetailDTO,
  CredentialNodeDTO,
  CredentialProviderDTO,
  SkillCategoryDTO,
  SkillDTO,
  SkillIcon,
} from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import {
  credentialProviders,
  credentials,
  credentialSkills,
  credentialTypes,
  projects,
  skillCategories,
  skillProjects,
  skills,
} from "../../database/schema";
import { loadMediaMap, pick } from "../media/mapper";
import { projectLink } from "./projects";
import { listed, viewable } from "./visibility";

/** Visible skill categories as a tree. A hidden category hides its subtree. */
export async function getSkillTree(db: DbExecutor): Promise<SkillCategoryDTO[]> {
  const [categoryRows, skillRows, links] = await Promise.all([
    db.select().from(skillCategories).orderBy(asc(skillCategories.displayOrder), asc(skillCategories.name)),
    db.select().from(skills).where(eq(skills.isVisible, true)).orderBy(asc(skills.displayOrder), asc(skills.name)),
    db
      .select({ skillId: skillProjects.skillId, slug: projects.slug, title: projects.title, type: projects.type })
      .from(skillProjects)
      .innerJoin(projects, eq(projects.id, skillProjects.projectId))
      .where(listed(projects)),
  ]);
  const toSkill = (row: typeof skills.$inferSelect): SkillDTO => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    level: row.level,
    years: row.years,
    icon: (row.icon as SkillIcon | null) ?? null,
    technologies: row.technologies,
    featured: row.featured,
    projects: links.filter((link) => link.skillId === row.id).map(projectLink),
  });
  const build = (parentId: string | null): SkillCategoryDTO[] =>
    categoryRows
      .filter((row) => row.parentId === parentId && row.isVisible)
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        skills: skillRows.filter((skill) => skill.categoryId === row.id).map(toSkill),
        children: build(row.id),
      }))
      .filter((category) => category.skills.length > 0 || category.children.length > 0);
  return build(null);
}

type CredentialRow = typeof credentials.$inferSelect;

async function credentialContext(db: DbExecutor) {
  const [rows, typeRows] = await Promise.all([
    db
      .select()
      .from(credentials)
      .where(eq(credentials.isVisible, true))
      .orderBy(asc(credentials.displayOrder), asc(credentials.title)),
    db.select().from(credentialTypes),
  ]);
  const types = new Map(typeRows.map((row) => [row.id, { name: row.name, slug: row.slug }]));
  const mediaMap = await loadMediaMap(db, rows.map((row) => row.imageMediaId));
  const toNode = (row: CredentialRow): CredentialNodeDTO => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: types.get(row.typeId) ?? { name: "Credential", slug: "credential" },
    level: row.level,
    issuedOn: row.issuedOn,
    expiresOn: row.expiresOn,
    featured: row.featured,
    verifiable: Boolean(row.verificationUrl || row.credentialUrl),
    image: pick(mediaMap, row.imageMediaId),
    children: rows.filter((child) => child.parentId === row.id).map(toNode),
  });
  return { rows, types, toNode };
}

export async function getCredentialTree(db: DbExecutor): Promise<CredentialProviderDTO[]> {
  const [providers, context] = await Promise.all([
    db
      .select()
      .from(credentialProviders)
      .where(eq(credentialProviders.isVisible, true))
      .orderBy(asc(credentialProviders.displayOrder), asc(credentialProviders.name)),
    credentialContext(db),
  ]);
  const logos = await loadMediaMap(db, providers.map((provider) => provider.logoMediaId));
  const countNodes = (nodes: CredentialNodeDTO[]): number =>
    nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0);
  return providers
    .map((provider) => {
      const roots = context.rows
        .filter((row) => row.providerId === provider.id && row.parentId === null)
        .map(context.toNode);
      return {
        id: provider.id,
        name: provider.name,
        slug: provider.slug,
        websiteUrl: provider.websiteUrl,
        logo: pick(logos, provider.logoMediaId),
        description: provider.description,
        credentials: roots,
        count: countNodes(roots),
      };
    })
    .filter((provider) => provider.count > 0);
}

export async function getCredentialDetail(db: DbExecutor, slug: string): Promise<CredentialDetailDTO | null> {
  const context = await credentialContext(db);
  const row = context.rows.find((item) => item.slug === slug);
  if (!row) return null;
  // A credential is public only if its whole ancestor chain is visible.
  const ancestors: { title: string; slug: string }[] = [];
  let parentId = row.parentId;
  while (parentId) {
    const parent = context.rows.find((item) => item.id === parentId);
    if (!parent) return null;
    ancestors.unshift({ title: parent.title, slug: parent.slug });
    parentId = parent.parentId;
  }
  const [[provider], skillRows, projectRows, mediaMap] = await Promise.all([
    db
      .select()
      .from(credentialProviders)
      .where(and(eq(credentialProviders.id, row.providerId), eq(credentialProviders.isVisible, true))),
    db
      .select({ name: skills.name, slug: skills.slug })
      .from(credentialSkills)
      .innerJoin(skills, eq(skills.id, credentialSkills.skillId))
      .where(and(eq(credentialSkills.credentialId, row.id), eq(skills.isVisible, true))),
    row.relatedProjectId
      ? db.select().from(projects).where(and(eq(projects.id, row.relatedProjectId), viewable(projects)))
      : Promise.resolve([]),
    loadMediaMap(db, [row.imageMediaId, row.pdfMediaId]),
  ]);
  if (!provider) return null;
  const logo = (await loadMediaMap(db, [provider.logoMediaId])).get(provider.logoMediaId ?? "") ?? null;
  const node = context.toNode(row);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    level: row.level,
    type: node.type,
    provider: { name: provider.name, slug: provider.slug, websiteUrl: provider.websiteUrl, logo },
    issuedOn: row.issuedOn,
    expiresOn: row.expiresOn,
    credentialCode: row.credentialCode,
    credentialUrl: row.credentialUrl,
    verificationUrl: row.verificationUrl,
    image: pick(mediaMap, row.imageMediaId),
    pdf: pick(mediaMap, row.pdfMediaId),
    skills: skillRows,
    relatedProject: projectRows[0] ? projectLink(projectRows[0]) : null,
    ancestors,
    children: node.children,
  };
}

export async function credentialSummary(db: DbExecutor) {
  const tree = await getCredentialTree(db);
  return {
    total: tree.reduce((sum, provider) => sum + provider.count, 0),
    providers: tree.map((provider) => ({ name: provider.name, slug: provider.slug, count: provider.count })),
  };
}


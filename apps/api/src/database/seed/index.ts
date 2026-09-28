import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { and, count, eq, sql } from "drizzle-orm";
import {
  ALL_PERMISSIONS,
  SYSTEM_ROLES,
  slugify,
  type Block,
  type ProjectSections,
} from "@portfolio/shared";
import { loadConfig } from "../../config/env";
import { hashPassword } from "../../lib/password";
import { buildSearchText } from "../../lib/search-text";
import { createDatabase, type Database, type DbExecutor } from "../client";
import * as s from "../schema";
import * as data from "./data";

export interface SeedOptions {
  log?: (message: string) => void;
  admin?: { email: string; name: string; password: string | null };
}

type Log = (message: string) => void;

async function seedRoles(tx: DbExecutor, log: Log) {
  for (const role of Object.values(SYSTEM_ROLES)) {
    const inserted = await tx
      .insert(s.roles)
      .values({ key: role.key, name: role.name, description: role.description, isSystem: role.key === "ADMIN" })
      .onConflictDoNothing({ target: s.roles.key })
      .returning({ id: s.roles.id });
    const [existing] = await tx.select({ id: s.roles.id }).from(s.roles).where(eq(s.roles.key, role.key));
    if (!existing) continue;
    // ADMIN always holds every permission (new permission keys are granted on re-seed).
    // Other roles receive their defaults only when first created, so admin edits persist.
    const permissions = role.key === "ADMIN" ? ALL_PERMISSIONS : inserted.length ? role.permissions : [];
    if (permissions.length) {
      await tx
        .insert(s.rolePermissions)
        .values(permissions.map((permission) => ({ roleId: existing.id, permission })))
        .onConflictDoNothing();
    }
    if (inserted.length) log(`role ${role.key} created`);
  }
}

async function seedAdmin(tx: DbExecutor, log: Log, admin: SeedOptions["admin"]) {
  const [{ value: userCount } = { value: 0 }] = await tx.select({ value: count() }).from(s.users);
  if (userCount > 0 || !admin) return;
  let password = admin.password;
  if (!password) {
    password = randomBytes(18).toString("base64url");
    log(
      `admin account ${admin.email} created with a generated password (shown once): ${password}\n` +
        "  Change it after signing in, or set SEED_ADMIN_PASSWORD before seeding.",
    );
  } else {
    log(`admin account ${admin.email} created`);
  }
  const [adminRole] = await tx.select({ id: s.roles.id }).from(s.roles).where(eq(s.roles.key, "ADMIN"));
  if (!adminRole) throw new Error("ADMIN role missing");
  await tx.insert(s.users).values({
    email: admin.email.toLowerCase(),
    name: admin.name,
    passwordHash: await hashPassword(password),
    roleId: adminRole.id,
    passwordChangedAt: new Date(),
  });
}

async function isEmpty(tx: DbExecutor, table: typeof s.socialLinks | typeof s.navigationItems | typeof s.focusAreas | typeof s.approachSteps) {
  const [row] = await tx.select({ value: count() }).from(table);
  return (row?.value ?? 0) === 0;
}

async function seedSite(tx: DbExecutor, log: Log) {
  const profileRows = await tx
    .insert(s.profile)
    .values({ id: 1, ...data.PROFILE })
    .onConflictDoNothing()
    .returning({ id: s.profile.id });
  if (profileRows.length) log("profile created");

  await tx
    .insert(s.siteSettings)
    .values({ id: 1, ...data.SITE_SETTINGS })
    .onConflictDoNothing();

  if (await isEmpty(tx, s.socialLinks)) {
    await tx.insert(s.socialLinks).values(
      data.SOCIAL_LINKS.map((link, index) => ({ ...link, displayOrder: index })),
    );
  }
  if (await isEmpty(tx, s.navigationItems)) {
    await tx.insert(s.navigationItems).values(
      data.NAVIGATION.map((item, index) => ({ ...item, displayOrder: index })),
    );
  }
  if (await isEmpty(tx, s.focusAreas)) {
    await tx.insert(s.focusAreas).values(data.FOCUS_AREAS.map((area, index) => ({ ...area, displayOrder: index })));
  }
  if (await isEmpty(tx, s.approachSteps)) {
    await tx
      .insert(s.approachSteps)
      .values(data.APPROACH_STEPS.map((step, index) => ({ ...step, displayOrder: index })));
  }
  for (const [routeKey, seo] of Object.entries(data.ROUTE_SEO)) {
    await tx
      .insert(s.seoMetadata)
      .values({ routeKey, title: seo.title, description: seo.description })
      .onConflictDoNothing({ target: s.seoMetadata.routeKey });
  }
}

async function seedCareer(tx: DbExecutor, log: Log) {
  for (const experience of data.EXPERIENCES) {
    const [existing] = await tx
      .select({ id: s.experiences.id })
      .from(s.experiences)
      .where(and(eq(s.experiences.company, experience.company), eq(s.experiences.position, experience.position)));
    if (existing) continue;
    await tx.insert(s.experiences).values({
      ...experience,
      responsibilities: [...experience.responsibilities],
      technologies: [...experience.technologies],
      domains: [...experience.domains],
    });
    log(`experience ${experience.position} @ ${experience.company} created`);
  }

  const educationIds = new Map<string, string>();
  for (const { key, ...entry } of data.EDUCATION) {
    const [existing] = await tx
      .select({ id: s.education.id })
      .from(s.education)
      .where(
        and(
          eq(s.education.institution, entry.institution),
          eq(s.education.degree, entry.degree),
          eq(s.education.fieldOfStudy, entry.fieldOfStudy),
        ),
      );
    if (existing) {
      educationIds.set(key, existing.id);
      continue;
    }
    const [created] = await tx.insert(s.education).values(entry).returning({ id: s.education.id });
    if (created) educationIds.set(key, created.id);
    log(`education ${entry.degree} ${entry.fieldOfStudy} created`);
  }
  return educationIds;
}

async function idBySlug(
  tx: DbExecutor,
  table: typeof s.research | typeof s.projects | typeof s.projectCategories | typeof s.tags,
  slug: string,
): Promise<string | null> {
  const [row] = await tx.select({ id: table.id }).from(table).where(eq(table.slug, slug));
  return row?.id ?? null;
}

async function seedResearch(tx: DbExecutor, log: Log, educationIds: Map<string, string>, now: Date) {
  for (const { educationKey, ...entry } of data.RESEARCH) {
    const inserted = await tx
      .insert(s.research)
      .values({
        ...entry,
        keywords: [...entry.keywords],
        methods: [...entry.methods],
        authors: [data.PROFILE.fullName],
        educationId: educationIds.get(educationKey) ?? null,
        status: "published",
        publishedAt: now,
        searchText: buildSearchText({
          lists: [entry.keywords, entry.methods],
          texts: [entry.degree, entry.institution],
        }),
      })
      .onConflictDoNothing({ target: s.research.slug })
      .returning({ id: s.research.id });
    if (inserted.length) log(`research ${entry.slug} created`);
  }

  for (const { researchSlug, ...presentation } of data.PRESENTATIONS) {
    const [existing] = await tx
      .select({ id: s.conferencePresentations.id })
      .from(s.conferencePresentations)
      .where(
        and(
          eq(s.conferencePresentations.title, presentation.title),
          eq(s.conferencePresentations.conferenceName, presentation.conferenceName),
        ),
      );
    if (existing) continue;
    await tx.insert(s.conferencePresentations).values({
      ...presentation,
      researchId: await idBySlug(tx, s.research, researchSlug),
      status: "published",
      publishedAt: now,
    });
    log(`presentation at ${presentation.conferenceShortName} created`);
  }
}

async function ensureTag(tx: DbExecutor, name: string): Promise<string> {
  const slug = slugify(name);
  await tx.insert(s.tags).values({ name, slug }).onConflictDoNothing({ target: s.tags.slug });
  const id = await idBySlug(tx, s.tags, slug);
  if (!id) throw new Error(`tag ${slug} missing`);
  return id;
}

async function seedProjects(tx: DbExecutor, log: Log, now: Date) {
  for (const category of data.PROJECT_CATEGORIES) {
    await tx.insert(s.projectCategories).values(category).onConflictDoNothing({ target: s.projectCategories.slug });
  }

  for (const project of data.PROJECTS) {
    const overview: Block[] = [
      { id: "overview-1", type: "paragraph", data: { markdown: project.overview } },
    ];
    const sections: Partial<ProjectSections> = { overview };
    const inserted = await tx
      .insert(s.projects)
      .values({
        slug: project.slug,
        title: project.title,
        summary: project.summary,
        type: project.type,
        categoryId: await idBySlug(tx, s.projectCategories, project.categorySlug),
        organization: project.organization,
        technologies: [...project.technologies],
        sections,
        status: "published",
        publishedAt: now,
        featured: project.featured,
        displayOrder: project.displayOrder,
        searchText: buildSearchText({
          sections,
          lists: [project.technologies, project.tags],
          texts: [project.organization],
        }),
      })
      .onConflictDoNothing({ target: s.projects.slug })
      .returning({ id: s.projects.id });
    const created = inserted[0];
    if (!created) continue;
    for (const tag of project.tags) {
      await tx.insert(s.projectTags).values({ projectId: created.id, tagId: await ensureTag(tx, tag) });
    }
    const researchId = await idBySlug(tx, s.research, project.researchSlug);
    if (researchId) await tx.insert(s.projectResearch).values({ projectId: created.id, researchId });
    log(`project ${project.slug} created`);
  }
}

async function seedSkills(tx: DbExecutor, log: Log) {
  let createdSkills = 0;
  for (const [categoryIndex, category] of data.SKILL_TREE.entries()) {
    await tx
      .insert(s.skillCategories)
      .values({ name: category.name, slug: category.slug, displayOrder: categoryIndex })
      .onConflictDoNothing({ target: s.skillCategories.slug });
    const [row] = await tx
      .select({ id: s.skillCategories.id })
      .from(s.skillCategories)
      .where(eq(s.skillCategories.slug, category.slug));
    if (!row) continue;
    for (const [skillIndex, name] of category.skills.entries()) {
      const inserted = await tx
        .insert(s.skills)
        .values({
          categoryId: row.id,
          name,
          slug: slugify(name),
          icon: data.SKILL_ICONS[name] ?? null,
          displayOrder: skillIndex,
        })
        .onConflictDoNothing({ target: [s.skills.categoryId, s.skills.slug] })
        .returning({ id: s.skills.id });
      createdSkills += inserted.length;
    }
  }
  for (const link of data.SKILL_PROJECT_LINKS) {
    const skillId = await skillIdByPath(tx, link.category, link.skill);
    const projectId = await idBySlug(tx, s.projects, link.project);
    if (skillId && projectId) {
      await tx.insert(s.skillProjects).values({ skillId, projectId }).onConflictDoNothing();
    }
  }
  if (createdSkills) log(`${createdSkills} skills created`);
}

async function skillIdByPath(tx: DbExecutor, categorySlug: string, skillSlug: string): Promise<string | null> {
  const [row] = await tx
    .select({ id: s.skills.id })
    .from(s.skills)
    .innerJoin(s.skillCategories, eq(s.skills.categoryId, s.skillCategories.id))
    .where(and(eq(s.skillCategories.slug, categorySlug), eq(s.skills.slug, skillSlug)));
  return row?.id ?? null;
}

async function seedCredentials(tx: DbExecutor, log: Log) {
  for (const [index, name] of data.CREDENTIAL_TYPES.entries()) {
    await tx
      .insert(s.credentialTypes)
      .values({ name, slug: slugify(name), displayOrder: index })
      .onConflictDoNothing({ target: s.credentialTypes.slug });
  }
  for (const provider of data.CREDENTIAL_PROVIDERS) {
    await tx.insert(s.credentialProviders).values(provider).onConflictDoNothing({ target: s.credentialProviders.slug });
  }
  let created = 0;
  for (const [index, credential] of data.CREDENTIALS.entries()) {
    const [provider] = await tx
      .select({ id: s.credentialProviders.id })
      .from(s.credentialProviders)
      .where(eq(s.credentialProviders.slug, credential.provider));
    const [type] = await tx
      .select({ id: s.credentialTypes.id })
      .from(s.credentialTypes)
      .where(eq(s.credentialTypes.slug, slugify(credential.type)));
    if (!provider || !type) continue;
    const inserted = await tx
      .insert(s.credentials)
      .values({
        providerId: provider.id,
        typeId: type.id,
        title: credential.title,
        slug: slugify(credential.title),
        displayOrder: index,
      })
      .onConflictDoNothing({ target: s.credentials.slug })
      .returning({ id: s.credentials.id });
    const row = inserted[0];
    if (!row) continue;
    created += 1;
    if (credential.skill) {
      const skillId = await skillIdByPath(tx, credential.skill[0], credential.skill[1]);
      if (skillId) await tx.insert(s.credentialSkills).values({ credentialId: row.id, skillId });
    }
  }
  if (created) log(`${created} credentials created`);
}

export async function seed(db: Database, options: SeedOptions = {}): Promise<void> {
  const log = options.log ?? (() => undefined);
  const now = new Date();
  await db.transaction(async (tx) => {
    await seedRoles(tx, log);
    await seedAdmin(tx, log, options.admin);
    await seedSite(tx, log);
    const educationIds = await seedCareer(tx, log);
    await seedResearch(tx, log, educationIds, now);
    await seedProjects(tx, log, now);
    await seedSkills(tx, log);
    await seedCredentials(tx, log);
  });
  // Planner statistics for freshly loaded tables.
  await db.execute(sql`ANALYZE`);
}

export function adminFromEnv(env: NodeJS.ProcessEnv, isProduction: boolean): SeedOptions["admin"] {
  const email = env.SEED_ADMIN_EMAIL?.trim() || data.PROFILE.email;
  const password = env.SEED_ADMIN_PASSWORD?.trim() || null;
  if (isProduction && !password) {
    console.warn(
      "SEED_ADMIN_PASSWORD is not set: skipping creation of the first admin account in production.",
    );
    return undefined;
  }
  if (password && password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");
  }
  return { email, name: env.SEED_ADMIN_NAME?.trim() || data.PROFILE.fullName, password };
}

async function main() {
  const config = loadConfig();
  const handle = createDatabase({ ...config.database, poolMax: 1 });
  try {
    await seed(handle.db, {
      log: (message) => console.log(`seed: ${message}`),
      admin: adminFromEnv(process.env, config.isProduction),
    });
    console.log("Seed complete.");
  } finally {
    await handle.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error("Seed failed:", error instanceof Error ? error.stack : error);
    process.exit(1);
  });
}

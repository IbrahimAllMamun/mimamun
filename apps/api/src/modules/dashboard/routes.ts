import { Router } from "express";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { PERMISSIONS, type DashboardDTO, type EntityType } from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import {
  auditLogs,
  blogPosts,
  contactMessages,
  credentials,
  integrationStatus,
  media,
  profile,
  projects,
  publications,
  research,
  siteSettings,
  users,
} from "../../database/schema";
import { requirePermission } from "../../middleware/auth";
import { iso, isoRequired, ok } from "../../lib/http";
import type { AppDeps } from "../../types";
import { analyticsSummary } from "../analytics/service";
import { toAuditDTO } from "../audit/service";

type Editorial = typeof projects | typeof research | typeof publications | typeof blogPosts;

async function statusCounts(db: DbExecutor, table: Editorial) {
  const rows = await db
    .select({ status: table.status, value: count() })
    .from(table)
    .groupBy(table.status);
  const pick = (status: string) => rows.find((row) => row.status === status)?.value ?? 0;
  return { published: pick("published"), draft: pick("draft"), archived: pick("archived") };
}

async function recentDrafts(db: DbExecutor): Promise<DashboardDTO["drafts"]> {
  const sources: { table: Editorial; type: EntityType; path: string }[] = [
    { table: projects, type: "project", path: "projects" },
    { table: research, type: "research", path: "research" },
    { table: publications, type: "publication", path: "publications" },
    { table: blogPosts, type: "blog_post", path: "blog-posts" },
  ];
  const lists = await Promise.all(
    sources.map(async (source) => {
      const rows = await db
        .select({
          id: source.table.id,
          title: source.table.title,
          updatedAt: source.table.updatedAt,
        })
        .from(source.table)
        .where(eq(source.table.status, "draft"))
        .orderBy(desc(source.table.updatedAt))
        .limit(5);
      return rows.map((row) => ({
        id: row.id,
        type: source.type,
        title: row.title,
        updatedAt: isoRequired(row.updatedAt),
        href: `/admin/${source.path}/${row.id}`,
      }));
    }),
  );
  return lists
    .flat()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);
}

export function dashboardRouter(deps: AppDeps): Router {
  const router = Router();
  const { db } = deps;

  router.get("/", requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
    const permissions = req.auth!.permissions;
    const canMessages = permissions.includes(PERMISSIONS.MESSAGES_MANAGE);
    const canAnalytics = permissions.includes(PERMISSIONS.ANALYTICS_READ);
    const canAudit = permissions.includes(PERMISSIONS.AUDIT_READ);

    const [
      projectCounts,
      researchCounts,
      publicationCounts,
      postCounts,
      [credentialCount],
      [mediaCount],
      [newMessages],
      drafts,
    ] = await Promise.all([
      statusCounts(db, projects),
      statusCounts(db, research),
      statusCounts(db, publications),
      statusCounts(db, blogPosts),
      db.select({ value: count() }).from(credentials),
      db.select({ value: count() }).from(media),
      db.select({ value: count() }).from(contactMessages).where(eq(contactMessages.status, "new")),
      recentDrafts(db),
    ]);

    const [activityRows, messageRows, [owner], [settings], [github], analytics] = await Promise.all(
      [
        canAudit
          ? db
              .select({ log: auditLogs, userName: users.name })
              .from(auditLogs)
              .leftJoin(users, eq(users.id, auditLogs.userId))
              .orderBy(desc(auditLogs.createdAt))
              .limit(8)
          : Promise.resolve([]),
        canMessages
          ? db
              .select()
              .from(contactMessages)
              .where(ne(contactMessages.status, "spam"))
              .orderBy(desc(contactMessages.createdAt))
              .limit(5)
          : Promise.resolve([]),
        db.select().from(profile),
        db.select().from(siteSettings),
        db.select().from(integrationStatus).where(eq(integrationStatus.key, "github")),
        canAnalytics ? analyticsSummary(db, 7, true) : Promise.resolve(null),
      ],
    );

    const [casedProjects] = await db
      .select({ value: count() })
      .from(projects)
      .where(
        and(
          eq(projects.status, "published"),
          sql`jsonb_array_length(coalesce(${projects.sections} -> 'results', '[]'::jsonb)) > 0`,
        ),
      );

    const dto: DashboardDTO = {
      counts: {
        projects: projectCounts,
        research: researchCounts,
        publications: publicationCounts,
        posts: postCounts,
        credentials: credentialCount?.value ?? 0,
        media: mediaCount?.value ?? 0,
        newMessages: canMessages ? (newMessages?.value ?? 0) : 0,
      },
      drafts,
      recentActivity: activityRows.map((row) => toAuditDTO(row.log, row.userName)),
      recentMessages: messageRows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        subject: row.subject,
        message: row.message.slice(0, 280),
        status: row.status,
        notifiedAt: iso(row.notifiedAt),
        readAt: iso(row.readAt),
        createdAt: isoRequired(row.createdAt),
      })),
      analytics,
      checklist: [
        {
          key: "cv",
          label: "Upload your CV so the Download CV button appears",
          done: Boolean(owner?.cvMediaId),
          href: "/admin/profile",
        },
        {
          key: "avatar",
          label: "Add a portrait photo (optional)",
          done: Boolean(owner?.avatarMediaId),
          href: "/admin/profile",
        },
        {
          key: "case-study",
          label: "Complete a project case study with results",
          done: (casedProjects?.value ?? 0) > 0,
          href: "/admin/projects",
        },
        {
          key: "og-image",
          label: "Set a default social sharing image",
          done: Boolean(settings?.defaultOgImageId),
          href: "/admin/settings",
        },
        {
          key: "mail",
          label: "Configure SMTP for contact notifications",
          done: deps.mailer.configured,
          href: "/admin/system",
        },
        {
          key: "github",
          label: "Sync and choose GitHub repositories to show",
          done: Boolean(github?.lastSuccessAt),
          href: "/admin/integrations",
        },
      ],
      integrations: [
        {
          key: "github",
          label: "GitHub",
          enabled: settings?.githubSyncEnabled ?? false,
          configured: Boolean(settings?.githubUsername),
          lastRunAt: iso(github?.lastRunAt ?? null),
          lastSuccessAt: iso(github?.lastSuccessAt ?? null),
          lastErrorAt: iso(github?.lastErrorAt ?? null),
          lastError: github?.lastError ?? null,
        },
        {
          key: "mail",
          label: "Email (SMTP)",
          enabled: deps.mailer.configured,
          configured: deps.mailer.configured,
          lastRunAt: null,
          lastSuccessAt: null,
          lastErrorAt: null,
          lastError: null,
        },
      ],
    };
    ok(res, dto);
  });

  return router;
}

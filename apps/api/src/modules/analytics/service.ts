import { createHash, randomBytes } from "node:crypto";
import type { Request } from "express";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import {
  isoDay,
  type AnalyticsEventInput,
  type AnalyticsSummaryDTO,
  type EntityType,
} from "@portfolio/shared";
import type { AppConfig } from "../../config/env";
import type { Database, DbExecutor } from "../../database/client";
import {
  analyticsEvents,
  analyticsSalts,
  blogPosts,
  credentials,
  projects,
  research,
} from "../../database/schema";
import { classifyUserAgent } from "../../lib/user-agent";

/** Derives the content entity from a public path, e.g. /projects/foo → project "foo". */
export function entityFromPath(
  path: string,
): { entityType: EntityType; entitySlug: string } | null {
  const match = /^\/(projects|research|blog|certifications)\/([a-z0-9-]{1,160})\/?$/.exec(path);
  if (!match) return null;
  const map: Record<string, EntityType> = {
    projects: "project",
    research: "research",
    blog: "blog_post",
    certifications: "credential",
  };
  return { entityType: map[match[1] ?? ""] as EntityType, entitySlug: match[2] ?? "" };
}

export function referrerHost(referrer: string | null | undefined, ownHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    return host && host !== ownHost ? host.slice(0, 120) : null;
  } catch {
    return null;
  }
}

async function dailySalt(db: DbExecutor, day: string): Promise<string> {
  await db
    .insert(analyticsSalts)
    .values({ day, salt: randomBytes(24).toString("base64url") })
    .onConflictDoNothing({ target: analyticsSalts.day });
  const [row] = await db
    .select({ salt: analyticsSalts.salt })
    .from(analyticsSalts)
    .where(eq(analyticsSalts.day, day));
  return row?.salt ?? "";
}

/** Admin screens and draft previews are never counted as visits. */
export function isPrivatePath(path: string): boolean {
  return /^\/(admin|preview)(\/|$)/.test(path);
}

/** Returns false when the event should not be recorded (opt-out, bot, disabled). */
export function shouldTrack(req: Request): boolean {
  if (req.header("dnt") === "1" || req.header("sec-gpc") === "1") return false;
  return !classifyUserAgent(req.header("user-agent")).isBot;
}

export async function recordEvent(
  db: Database,
  config: AppConfig,
  req: Request,
  input: AnalyticsEventInput,
): Promise<void> {
  const ua = classifyUserAgent(req.header("user-agent"));
  const path = input.path.split(/[?#]/)[0]?.slice(0, 300) ?? "/";
  if (isPrivatePath(path)) return;
  const ownHost = new URL(config.appUrl).hostname.replace(/^www\./, "");
  const day = isoDay();
  const salt = await dailySalt(db, day);
  const visitorHash = createHash("sha256")
    .update(`${salt}|${req.ip ?? ""}|${req.header("user-agent") ?? ""}`)
    .digest("hex")
    .slice(0, 32);
  const countryHeader = config.analytics.countryHeader;
  const rawCountry = countryHeader ? req.header(countryHeader) : undefined;
  const country = rawCountry && /^[A-Za-z]{2}$/.test(rawCountry) ? rawCountry.toUpperCase() : null;
  const entity = input.type === "page_view" ? entityFromPath(path) : null;
  await db.insert(analyticsEvents).values({
    type: input.type,
    path,
    entityType: entity?.entityType ?? null,
    entitySlug: entity?.entitySlug ?? null,
    referrerHost: input.type === "page_view" ? referrerHost(input.referrer, ownHost) : null,
    target: input.target ? input.target.slice(0, 500) : null,
    device: ua.device,
    browser: ua.browser,
    os: ua.os,
    country,
    visitorHash,
  });
}

/** Deletes events older than the retention window and salts older than two days. */
export async function purgeAnalytics(db: DbExecutor, retentionDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const deleted = await db
    .delete(analyticsEvents)
    .where(lt(analyticsEvents.occurredAt, cutoff))
    .returning({ id: analyticsEvents.id });
  await db
    .delete(analyticsSalts)
    .where(lt(analyticsSalts.day, isoDay(new Date(Date.now() - 2 * 86_400_000))));
  return deleted.length;
}

type CountRow = { name: string | null; value: number };

export async function analyticsSummary(
  db: DbExecutor,
  days: number,
  enabled: boolean,
): Promise<AnalyticsSummaryDTO> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const previousStart = new Date(start.getTime() - days * 86_400_000);
  const inRange = and(gte(analyticsEvents.occurredAt, start), lt(analyticsEvents.occurredAt, end));
  const pageViews = and(inRange, eq(analyticsEvents.type, "page_view"));

  const totals = async (from: Date, to: Date) => {
    const [row] = await db
      .select({
        pageViews: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'page_view')::int`,
        visitors: sql<number>`count(distinct ${analyticsEvents.visitorHash}) filter (where ${analyticsEvents.type} = 'page_view')::int`,
        downloads: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'download')::int`,
        outboundClicks: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'outbound_click')::int`,
      })
      .from(analyticsEvents)
      .where(and(gte(analyticsEvents.occurredAt, from), lt(analyticsEvents.occurredAt, to)));
    return row ?? { pageViews: 0, visitors: 0, downloads: 0, outboundClicks: 0 };
  };

  const top = async (
    columnSql: ReturnType<typeof sql>,
    where = pageViews,
    limit = 8,
  ): Promise<CountRow[]> => {
    const result = await db.execute<CountRow>(
      sql`SELECT ${columnSql} AS name, count(*)::int AS value FROM ${analyticsEvents} WHERE ${where} AND ${columnSql} IS NOT NULL GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${limit}`,
    );
    return result.rows;
  };

  const dailyResult = await db.execute<{ date: string; page_views: number; visitors: number }>(sql`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
           count(e.id)::int AS page_views,
           count(DISTINCT e.visitor_hash)::int AS visitors
    FROM generate_series(date_trunc('day', ${start.toISOString()}::timestamptz), date_trunc('day', ${end.toISOString()}::timestamptz), interval '1 day') AS d(day)
    LEFT JOIN analytics_events e
      ON e.type = 'page_view' AND e.occurred_at >= d.day AND e.occurred_at < d.day + interval '1 day'
    GROUP BY d.day ORDER BY d.day`);

  const popularRows = await db.execute<{ type: EntityType; slug: string; views: number }>(sql`
    SELECT entity_type AS type, entity_slug AS slug, count(*)::int AS views
    FROM analytics_events
    WHERE ${pageViews} AND entity_type IS NOT NULL
    GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 10`);
  const titles = await titlesFor(db, popularRows.rows);

  const [
    current,
    previous,
    topPages,
    referrers,
    devices,
    browsers,
    countries,
    downloads,
    outbound,
  ] = await Promise.all([
    totals(start, end),
    totals(previousStart, start),
    top(sql`path`),
    top(sql`referrer_host`),
    top(sql`device::text`),
    top(sql`browser`),
    top(sql`country`),
    top(sql`target`, and(inRange, eq(analyticsEvents.type, "download"))),
    top(sql`target`, and(inRange, eq(analyticsEvents.type, "outbound_click"))),
  ]);

  const named = (rows: CountRow[]) =>
    rows.map((row) => ({ name: row.name ?? "Unknown", count: row.value }));
  return {
    days,
    enabled,
    totals: current,
    previousTotals: { pageViews: previous.pageViews, visitors: previous.visitors },
    daily: dailyResult.rows.map((row) => ({
      date: row.date,
      pageViews: row.page_views,
      visitors: row.visitors,
    })),
    topPages: topPages.map((row) => ({ path: row.name ?? "/", views: row.value })),
    referrers: referrers.map((row) => ({ host: row.name ?? "", views: row.value })),
    devices: named(devices),
    browsers: named(browsers),
    countries: named(countries),
    popular: popularRows.rows.map((row) => ({
      type: row.type,
      slug: row.slug,
      title: titles.get(`${row.type}:${row.slug}`) ?? row.slug,
      views: row.views,
    })),
    downloads: downloads.map((row) => ({ target: row.name ?? "", count: row.value })),
    outbound: outbound.map((row) => ({ target: row.name ?? "", count: row.value })),
  };
}

async function titlesFor(
  db: DbExecutor,
  rows: { type: EntityType; slug: string }[],
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  const tables = {
    project: projects,
    research,
    blog_post: blogPosts,
    credential: credentials,
  } as const;
  for (const [type, table] of Object.entries(tables)) {
    const slugs = rows.filter((row) => row.type === type).map((row) => row.slug);
    if (slugs.length === 0) continue;
    const found = await db
      .select({ slug: table.slug, title: table.title })
      .from(table)
      .where(
        sql`${table.slug} IN (${sql.join(
          slugs.map((slug) => sql`${slug}`),
          sql`, `,
        )})`,
      );
    for (const row of found) titles.set(`${type}:${row.slug}`, row.title);
  }
  return titles;
}

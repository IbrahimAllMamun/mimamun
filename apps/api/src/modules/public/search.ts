import { sql } from "drizzle-orm";
import { truncate, type SearchResultDTO } from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";

/**
 * Cross-content full-text search over published, public content. Uses the
 * generated tsvector columns and falls back to title matching for short or
 * partial terms that full-text parsing drops.
 */
export async function searchPublic(db: DbExecutor, q: string): Promise<SearchResultDTO[]> {
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const result = await db.execute<{ type: SearchResultDTO["type"]; title: string; slug: string; excerpt: string | null; meta: string | null; rank: number }>(sql`
    WITH query AS (SELECT websearch_to_tsquery('english', ${q}) AS tsq)
    SELECT * FROM (
      SELECT 'project' AS type, title, slug, summary AS excerpt, NULL::text AS meta,
             ts_rank(search_vector, query.tsq) + CASE WHEN title ILIKE ${like} THEN 1 ELSE 0 END AS rank
      FROM projects, query
      WHERE status = 'published' AND visibility = 'public' AND (search_vector @@ query.tsq OR title ILIKE ${like})
      UNION ALL
      SELECT 'research', title, slug, summary, NULL,
             ts_rank(search_vector, query.tsq) + CASE WHEN title ILIKE ${like} THEN 1 ELSE 0 END
      FROM research, query
      WHERE status = 'published' AND visibility = 'public' AND (search_vector @@ query.tsq OR title ILIKE ${like})
      UNION ALL
      SELECT 'publication', title, slug, abstract, venue,
             ts_rank(search_vector, query.tsq) + CASE WHEN title ILIKE ${like} THEN 1 ELSE 0 END
      FROM publications, query
      WHERE status = 'published' AND visibility = 'public' AND (search_vector @@ query.tsq OR title ILIKE ${like})
      UNION ALL
      SELECT 'blog_post', title, slug, excerpt, NULL,
             ts_rank(search_vector, query.tsq) + CASE WHEN title ILIKE ${like} THEN 1 ELSE 0 END
      FROM blog_posts, query
      WHERE status = 'published' AND visibility = 'public' AND (search_vector @@ query.tsq OR title ILIKE ${like})
      UNION ALL
      SELECT 'credential', c.title, c.slug, c.description, p.name, CASE WHEN c.title ILIKE ${like} THEN 0.5 ELSE 0.1 END
      FROM credentials c JOIN credential_providers p ON p.id = c.provider_id
      WHERE c.is_visible AND p.is_visible AND (c.title ILIKE ${like} OR p.name ILIKE ${like})
    ) results
    ORDER BY rank DESC, title
    LIMIT 30`);
  const paths: Record<string, string> = {
    project: "/projects/",
    research: "/research/",
    publication: "/publications#",
    blog_post: "/blog/",
    credential: "/certifications/",
  };
  return result.rows.map((row) => ({
    type: row.type,
    title: row.title,
    url: `${paths[row.type] ?? "/"}${row.slug}`,
    excerpt: row.excerpt ? truncate(row.excerpt, 220) : null,
    meta: row.meta,
  }));
}

import { Router } from "express";
import { sql } from "drizzle-orm";
import { PERMISSIONS, searchQueryInput, type AdminSearchResultDTO } from "@portfolio/shared";
import { requirePermission } from "../../middleware/auth";
import { ok, parse } from "../../lib/http";
import type { AppDeps } from "../../types";

/** Admin-wide search across content (all statuses), media and, if permitted, messages. */
export function adminSearchRouter(deps: AppDeps): Router {
  const router = Router();
  router.get("/", requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
    const { q } = parse(searchQueryInput, req.query, "Enter something to search for");
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    const includeMessages = req.auth!.permissions.includes(PERMISSIONS.MESSAGES_MANAGE);
    const result = await deps.db.execute<Record<string, unknown>>(sql`
      SELECT * FROM (
        SELECT 'project' AS type, id::text, title, status::text AS subtitle, '/admin/projects/' || id AS href, 1 AS sort FROM projects WHERE title ILIKE ${like} OR summary ILIKE ${like}
        UNION ALL SELECT 'research', id::text, title, status::text, '/admin/research/' || id, 2 FROM research WHERE title ILIKE ${like} OR summary ILIKE ${like}
        UNION ALL SELECT 'publication', id::text, title, status::text, '/admin/publications/' || id, 3 FROM publications WHERE title ILIKE ${like} OR coalesce(venue, '') ILIKE ${like}
        UNION ALL SELECT 'blog_post', id::text, title, status::text, '/admin/blog-posts/' || id, 4 FROM blog_posts WHERE title ILIKE ${like} OR coalesce(excerpt, '') ILIKE ${like}
        UNION ALL SELECT 'experience', id::text, position || ' · ' || company, NULL, '/admin/experiences/' || id, 5 FROM experiences WHERE position ILIKE ${like} OR company ILIKE ${like}
        UNION ALL SELECT 'education', id::text, degree || ' · ' || institution, NULL, '/admin/education/' || id, 6 FROM education WHERE degree ILIKE ${like} OR institution ILIKE ${like} OR coalesce(field_of_study, '') ILIKE ${like}
        UNION ALL SELECT 'credential', id::text, title, NULL, '/admin/credentials/' || id, 7 FROM credentials WHERE title ILIKE ${like}
        UNION ALL SELECT 'skill', id::text, name, NULL, '/admin/skills/' || id, 8 FROM skills WHERE name ILIKE ${like}
        UNION ALL SELECT 'media', id::text, original_name, coalesce(title, alt_text), '/admin/media?open=' || id, 9 FROM media WHERE original_name ILIKE ${like} OR coalesce(title, '') ILIKE ${like} OR coalesce(alt_text, '') ILIKE ${like}
        ${includeMessages ? sql`UNION ALL SELECT 'message', id::text, subject, name || ' <' || email || '>', '/admin/messages/' || id, 10 FROM contact_messages WHERE subject ILIKE ${like} OR name ILIKE ${like} OR email ILIKE ${like}` : sql``}
      ) results
      ORDER BY sort, title
      LIMIT 40`);
    const items: AdminSearchResultDTO[] = result.rows.map((row) => ({
      type: row.type as AdminSearchResultDTO["type"],
      id: String(row.id),
      title: String(row.title),
      subtitle: (row.subtitle as string | null) ?? null,
      href: String(row.href),
    }));
    ok(res, items);
  });
  return router;
}

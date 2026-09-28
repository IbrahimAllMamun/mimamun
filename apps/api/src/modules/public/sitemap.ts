import { sql } from "drizzle-orm";
import type { CredentialNodeDTO, SitemapEntryDTO } from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import { getCredentialTree } from "./taxonomies";

/** Every public, indexable URL with its last modification time. */
export async function getSitemap(db: DbExecutor): Promise<SitemapEntryDTO[]> {
  const result = await db.execute<{ path: string; updated_at: string }>(sql`
    SELECT '/projects/' || p.slug AS path, p.updated_at FROM projects p
      LEFT JOIN seo_metadata s ON s.id = p.seo_id
      WHERE p.status = 'published' AND p.visibility = 'public' AND coalesce(s.noindex, false) = false
    UNION ALL
    SELECT '/research/' || r.slug, r.updated_at FROM research r
      LEFT JOIN seo_metadata s ON s.id = r.seo_id
      WHERE r.status = 'published' AND r.visibility = 'public' AND coalesce(s.noindex, false) = false
    UNION ALL
    SELECT '/blog/' || b.slug, b.updated_at FROM blog_posts b
      LEFT JOIN seo_metadata s ON s.id = b.seo_id
      WHERE b.status = 'published' AND b.visibility = 'public' AND coalesce(s.noindex, false) = false
`);
  const entries = result.rows.map((row) => ({ path: row.path, updatedAt: new Date(row.updated_at).toISOString() }));
  // Credentials are public only when their provider and every ancestor are visible.
  const walk = (nodes: CredentialNodeDTO[]): string[] => nodes.flatMap((node) => [node.slug, ...walk(node.children)]);
  const visibleSlugs = new Set((await getCredentialTree(db)).flatMap((provider) => walk(provider.credentials)));
  const credentialRows = await db.execute<{ slug: string; updated_at: string }>(
    sql`SELECT slug, updated_at FROM credentials WHERE is_visible`,
  );
  for (const row of credentialRows.rows) {
    if (visibleSlugs.has(row.slug)) {
      entries.push({ path: `/certifications/${row.slug}`, updatedAt: new Date(row.updated_at).toISOString() });
    }
  }
  return entries;
}

import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/**
 * Visibility rules for public content, in one place.
 *  - listed:   published and public (appears in lists, search, sitemap)
 *  - viewable: published and public or unlisted (reachable by URL)
 */
export interface EditorialColumns {
  status: PgColumn;
  visibility: PgColumn;
}

export function listed(table: EditorialColumns): SQL {
  return and(eq(table.status, "published"), eq(table.visibility, "public")) as SQL;
}

export function viewable(table: EditorialColumns): SQL {
  return and(eq(table.status, "published"), inArray(table.visibility, ["public", "unlisted"])) as SQL;
}

/** `preview` bypasses publication rules (admin preview only). */
export function viewableUnless(preview: boolean, table: EditorialColumns): SQL | undefined {
  return preview ? undefined : viewable(table);
}

export function yearExpression(completed: PgColumn, started: PgColumn): SQL<number | null> {
  return sql<number | null>`extract(year from coalesce(${completed}, ${started}))::int`;
}

import { and, eq, ne, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { getTableColumns } from "drizzle-orm";
import type { SeoFieldsInput } from "@portfolio/shared";
import type { DbExecutor } from "../database/client";
import { seoMetadata } from "../database/schema";

/** Column lookup for generic helpers that work across tables. */
export function column(table: PgTable, name: string): PgColumn {
  const columns = getTableColumns(table) as Record<string, PgColumn>;
  const found = columns[name];
  if (!found) throw new Error(`Column ${name} not found`);
  return found;
}

export function hasColumn(table: PgTable, name: string): boolean {
  return name in (getTableColumns(table) as Record<string, PgColumn>);
}

/** Escapes LIKE wildcards in user input. */
export function likeTerm(value: string): string {
  return `%${value.replace(/[%_\\]/g, "\\$&")}%`;
}

/**
 * Returns `desired` or `desired-2`, `desired-3`… so slugs stay unique.
 * `scope` narrows uniqueness (e.g. skills are unique per category).
 */
export async function uniqueSlug(
  db: DbExecutor,
  table: PgTable,
  desired: string,
  options: { excludeId?: string | null; scope?: SQL } = {},
): Promise<string> {
  const slugColumn = column(table, "slug");
  const idColumn = column(table, "id");
  const base = desired.slice(0, 110).replace(/-+$/g, "") || "item";
  for (let attempt = 1; attempt < 200; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const conditions: SQL[] = [eq(slugColumn, candidate)];
    if (options.excludeId) conditions.push(ne(idColumn, options.excludeId));
    if (options.scope) conditions.push(options.scope);
    const rows = await db.select({ id: idColumn }).from(table).where(and(...conditions)).limit(1);
    if (rows.length === 0) return candidate;
  }
  throw new Error("Could not find a unique slug");
}

/** Replaces the rows of a join table for one owner. */
export async function syncLinks(
  tx: DbExecutor,
  joinTable: PgTable,
  ownerColumn: string,
  ownerId: string,
  targetColumn: string,
  targetIds: readonly string[],
  extra?: (targetId: string, index: number) => Record<string, unknown>,
): Promise<void> {
  await tx.delete(joinTable).where(eq(column(joinTable, ownerColumn), ownerId));
  if (targetIds.length === 0) return;
  await tx.insert(joinTable).values(
    targetIds.map((targetId, index) => ({
      [ownerColumn]: ownerId,
      [targetColumn]: targetId,
      ...(extra?.(targetId, index) ?? {}),
    })) as never,
  );
}

export async function loadLinks(
  db: DbExecutor,
  joinTable: PgTable,
  ownerColumn: string,
  ownerIds: readonly string[],
  targetColumn: string,
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (ownerIds.length === 0) return result;
  const owner = column(joinTable, ownerColumn);
  const target = column(joinTable, targetColumn);
  const rows = (await db
    .select({ owner, target })
    .from(joinTable)
    .where(sql`${owner} IN (${sql.join(ownerIds.map((id) => sql`${id}`), sql`, `)})`)) as {
    owner: string;
    target: string;
  }[];
  for (const row of rows) {
    const list = result.get(row.owner) ?? [];
    list.push(row.target);
    result.set(row.owner, list);
  }
  return result;
}

function seoIsEmpty(input: SeoFieldsInput): boolean {
  return !input.title && !input.description && !input.canonicalUrl && !input.ogImageId && !input.noindex;
}

/** Creates, updates or clears the SEO row referenced by a content record. Returns the id to store. */
export async function upsertSeo(
  tx: DbExecutor,
  currentId: string | null,
  input: SeoFieldsInput | undefined,
): Promise<string | null> {
  if (!input) return currentId;
  if (seoIsEmpty(input)) {
    if (currentId) await tx.delete(seoMetadata).where(eq(seoMetadata.id, currentId));
    return null;
  }
  const values = {
    title: input.title,
    description: input.description,
    canonicalUrl: input.canonicalUrl,
    ogImageId: input.ogImageId,
    noindex: input.noindex,
  };
  if (currentId) {
    await tx.update(seoMetadata).set(values).where(eq(seoMetadata.id, currentId));
    return currentId;
  }
  const [created] = await tx.insert(seoMetadata).values(values).returning({ id: seoMetadata.id });
  return created?.id ?? null;
}

export async function loadSeo(db: DbExecutor, seoId: string | null): Promise<SeoFieldsInput> {
  if (!seoId) return { title: null, description: null, canonicalUrl: null, ogImageId: null, noindex: false };
  const [row] = await db.select().from(seoMetadata).where(eq(seoMetadata.id, seoId));
  return {
    title: row?.title ?? null,
    description: row?.description ?? null,
    canonicalUrl: row?.canonicalUrl ?? null,
    ogImageId: row?.ogImageId ?? null,
    noindex: row?.noindex ?? false,
  };
}

/** Sets display_order to the position of each id in `ids` in one statement. */
export async function reorderRows(tx: DbExecutor, table: PgTable, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const idColumn = column(table, "id");
  column(table, "displayOrder"); // asserts the table is orderable
  const values = sql.join(
    ids.map((id, index) => sql`(${id}::uuid, ${index}::int)`),
    sql`, `,
  );
  await tx.execute(
    sql`UPDATE ${table} SET "display_order" = v.ord FROM (VALUES ${values}) AS v(id, ord) WHERE ${idColumn} = v.id`,
  );
}

/** publishedAt rule: set the first time something is published; kept afterwards for history. */
export function resolvePublishedAt(
  status: string,
  requested: string | null | undefined,
  current: Date | null,
): Date | null {
  if (requested) return new Date(requested);
  if (status === "published") return current ?? new Date();
  return current;
}

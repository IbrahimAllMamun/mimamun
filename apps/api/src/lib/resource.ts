import { Router, type Request } from "express";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { z } from "zod";
import {
  adminListQuery,
  bulkInput,
  PERMISSIONS,
  pageMeta,
  reorderInput,
  slugify,
  statusChangeInput,
  type AdminListItemDTO,
  type AdminListQuery,
  type BulkAction,
  type Permission,
} from "@portfolio/shared";
import type { DbExecutor } from "../database/client";
import { seoMetadata } from "../database/schema";
import { requirePermission } from "../middleware/auth";
import { recordAudit } from "../modules/audit/service";
import type { AppDeps } from "../types";
import {
  column,
  hasColumn,
  likeTerm,
  loadSeo,
  reorderRows,
  resolvePublishedAt,
  uniqueSlug,
  upsertSeo,
} from "./content";
import { AppError, conflict, forbidden, notFound } from "./errors";
import { created, noContent, ok, parse } from "./http";

export type Row = Record<string, unknown> & { id: string };

export interface ResourceDefinition<TInput extends Record<string, unknown>> {
  /** URL segment under /api/admin, e.g. "projects". */
  path: string;
  /** Audit/analytics entity type, e.g. "project". */
  entityType: string;
  /** Human label used in messages, e.g. "Project". */
  label: string;
  table: PgTable;
  input: z.ZodType<TInput, unknown>;
  permissions?: Partial<Record<"read" | "write" | "remove" | "publish", Permission>>;
  /** Input field used to derive a slug when the admin leaves it empty. */
  slugSource?: keyof TInput & string;
  slugScope?: (input: TInput) => SQL | undefined;
  /** Column keys searched with ILIKE by the list endpoint. */
  searchColumns?: string[];
  defaultSort: SQL[];
  sorts?: Record<string, SQL[]>;
  filters?: (query: AdminListQuery) => SQL[];
  listItem: (row: Row) => AdminListItemDTO;
  /** Input keys that are persisted by `saveRelations` instead of as columns. */
  relationKeys?: string[];
  loadRelations?: (db: DbExecutor, ids: string[]) => Promise<Map<string, Record<string, unknown>>>;
  saveRelations?: (tx: DbExecutor, id: string, input: TInput) => Promise<void>;
  /** Extra/derived column values (e.g. search text, reading time). */
  derived?: (
    input: TInput,
    context: { userId: string | null; existing: Row | null },
  ) => Record<string, unknown>;
  toRecord?: (row: Row) => Record<string, unknown>;
  validate?: (db: DbExecutor, input: TInput, existing: Row | null) => Promise<void>;
  beforeDelete?: (db: DbExecutor, row: Row) => Promise<void>;
  /** Content with an SEO override row (`seo_id`). */
  seo?: boolean;
}

const PUBLISH_FIELDS = ["status", "featured", "visibility", "isVisible"] as const;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Builds the common admin list row. */
export function listItem(
  row: Row,
  fields: { title: string; subtitle?: string | null; extra?: AdminListItemDTO["extra"] },
): AdminListItemDTO {
  return {
    id: row.id,
    title: fields.title,
    subtitle: fields.subtitle ?? null,
    slug: (row.slug as string | undefined) ?? null,
    status: (row.status as AdminListItemDTO["status"] | undefined) ?? null,
    featured: (row.featured as boolean | undefined) ?? null,
    isVisible: (row.isVisible as boolean | undefined) ?? null,
    displayOrder: (row.displayOrder as number | undefined) ?? null,
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt ?? ""),
    extra: fields.extra ?? {},
  };
}

function permissionsFor(definition: ResourceDefinition<Record<string, unknown>>) {
  return {
    read: definition.permissions?.read ?? PERMISSIONS.CONTENT_READ,
    write: definition.permissions?.write ?? PERMISSIONS.CONTENT_WRITE,
    remove: definition.permissions?.remove ?? PERMISSIONS.CONTENT_DELETE,
    publish: definition.permissions?.publish ?? PERMISSIONS.CONTENT_PUBLISH,
  };
}

function has(req: Request, permission: Permission): boolean {
  return Boolean(req.auth?.permissions.includes(permission));
}

export class ResourceService<TInput extends Record<string, unknown>> {
  readonly editorial: boolean;
  readonly orderable: boolean;
  readonly visibleToggle: boolean;
  readonly featurable: boolean;
  readonly sluggable: boolean;

  constructor(
    readonly definition: ResourceDefinition<TInput>,
    readonly deps: Pick<AppDeps, "db" | "revalidator">,
  ) {
    const table = definition.table;
    this.editorial = hasColumn(table, "status");
    this.orderable = hasColumn(table, "displayOrder");
    this.visibleToggle = hasColumn(table, "isVisible");
    this.featurable = hasColumn(table, "featured");
    this.sluggable = hasColumn(table, "slug");
  }

  private get table() {
    return this.definition.table;
  }

  private col(name: string) {
    return column(this.table, name);
  }

  async find(db: DbExecutor, id: string): Promise<Row | null> {
    const rows = (await db
      .select()
      .from(this.table)
      .where(eq(this.col("id"), id))
      .limit(1)) as Row[];
    return rows[0] ?? null;
  }

  async list(db: DbExecutor, query: AdminListQuery) {
    const filters: SQL[] = [...(this.definition.filters?.(query) ?? [])];
    if (query.q && this.definition.searchColumns?.length) {
      const term = likeTerm(query.q);
      const search = or(
        ...this.definition.searchColumns.map((name) => ilike(this.col(name), term)),
      );
      if (search) filters.push(search);
    }
    if (query.status && this.editorial) filters.push(eq(this.col("status"), query.status));
    if (query.featured && this.featurable)
      filters.push(eq(this.col("featured"), query.featured === "true"));
    if (query.visible && this.visibleToggle)
      filters.push(eq(this.col("isVisible"), query.visible === "true"));
    const where = filters.length ? and(...filters) : undefined;
    const sorts: Record<string, SQL[]> = {
      updated: [desc(this.col("updatedAt"))],
      ...(this.orderable ? { order: [asc(this.col("displayOrder"))] } : {}),
      ...(this.definition.sorts ?? {}),
    };
    const orderBy = (query.sort && sorts[query.sort]) || this.definition.defaultSort;
    const [rows, [total]] = await Promise.all([
      db
        .select()
        .from(this.table)
        .where(where)
        .orderBy(...orderBy)
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize) as unknown as Promise<Row[]>,
      db.select({ value: count() }).from(this.table).where(where),
    ]);
    return {
      items: rows.map(this.definition.listItem),
      meta: pageMeta(query.page, query.pageSize, total?.value ?? 0),
    };
  }

  /** The editable representation returned to the admin editor. */
  async toRecord(db: DbExecutor, row: Row): Promise<Record<string, unknown>> {
    const base = this.definition.toRecord ? this.definition.toRecord(row) : { ...row };
    delete base.searchText;
    delete base.searchVector;
    const relations = (await this.definition.loadRelations?.(db, [row.id]))?.get(row.id) ?? {};
    const seo = this.definition.seo
      ? { seo: await loadSeo(db, (row.seoId as string | null) ?? null) }
      : {};
    return {
      ...base,
      ...relations,
      ...seo,
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async resolveSlug(
    db: DbExecutor,
    input: TInput,
    existing: Row | null,
  ): Promise<string | null> {
    if (!this.sluggable) return null;
    const requested = (input.slug as string | null | undefined) ?? null;
    const scope = this.definition.slugScope?.(input);
    if (requested) {
      const taken = await uniqueSlug(db, this.table, requested, {
        excludeId: existing?.id ?? null,
        scope,
      });
      if (taken !== requested) {
        throw conflict("That URL slug is already used", [
          { path: "slug", message: "Already used by another item" },
        ]);
      }
      return requested;
    }
    // Slugs are stable: an existing record keeps its slug unless the admin changes it.
    if (existing?.slug) return existing.slug as string;
    const source = this.definition.slugSource
      ? String(input[this.definition.slugSource] ?? "")
      : "";
    return uniqueSlug(db, this.table, slugify(source), { scope });
  }

  private columnValues(
    input: TInput,
    slug: string | null,
    existing: Row | null,
    userId: string | null,
  ): Record<string, unknown> {
    const skip = new Set([...(this.definition.relationKeys ?? []), "seo", "slug", "publishedAt"]);
    const values: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!skip.has(key) && hasColumn(this.table, key)) values[key] = value;
    }
    if (this.sluggable && slug) values.slug = slug;
    if (this.editorial) {
      values.publishedAt = resolvePublishedAt(
        String(input.status ?? existing?.status ?? "draft"),
        (input.publishedAt as string | null | undefined) ?? null,
        (existing?.publishedAt as Date | null | undefined) ?? null,
      );
    }
    return { ...values, ...(this.definition.derived?.(input, { userId, existing }) ?? {}) };
  }

  private assertPublishAllowed(req: Request, input: Record<string, unknown>, existing: Row | null) {
    const { publish } = permissionsFor(
      this.definition as ResourceDefinition<Record<string, unknown>>,
    );
    if (has(req, publish)) return;
    if (!existing) {
      const publishing = this.editorial && (input.status ?? "draft") !== "draft";
      if (publishing || input.featured === true)
        throw forbidden("You can save drafts but not publish or feature content");
      return;
    }
    for (const field of PUBLISH_FIELDS) {
      if (field in input && hasColumn(this.table, field) && input[field] !== existing[field]) {
        throw forbidden("You do not have permission to publish, feature or hide content");
      }
    }
  }

  async create(req: Request, raw: unknown): Promise<Record<string, unknown>> {
    const input = parse(this.definition.input, raw);
    this.assertPublishAllowed(req, input, null);
    const record = await this.deps.db.transaction(async (tx) => {
      await this.definition.validate?.(tx, input, null);
      const slug = await this.resolveSlug(tx, input, null);
      const values = this.columnValues(input, slug, null, req.auth?.user.id ?? null);
      if (hasColumn(this.table, "createdBy")) values.createdBy = req.auth?.user.id ?? null;
      if (hasColumn(this.table, "updatedBy")) values.updatedBy = req.auth?.user.id ?? null;
      if (this.definition.seo) values.seoId = await upsertSeo(tx, null, input.seo as never);
      const [row] = (await tx
        .insert(this.table)
        .values(values as never)
        .returning()) as Row[];
      if (!row) throw new Error("Insert returned no row");
      await this.definition.saveRelations?.(tx, row.id, input);
      const snapshot = await this.toRecord(tx, row);
      await recordAudit(tx, req, {
        action: `${this.definition.entityType}.create`,
        entityType: this.definition.entityType,
        entityId: row.id,
        summary: `Created ${this.definition.label.toLowerCase()} "${this.titleOf(row)}"`,
        after: snapshot,
      });
      return snapshot;
    });
    this.deps.revalidator.contentChanged(`${this.definition.entityType}:create`);
    return record;
  }

  async update(req: Request, id: string, raw: unknown): Promise<Record<string, unknown>> {
    const input = parse(this.definition.input, raw);
    const record = await this.deps.db.transaction(async (tx) => {
      const existing = (await tx
        .select()
        .from(this.table)
        .where(eq(this.col("id"), id))
        .for("update")) as Row[];
      const current = existing[0];
      if (!current) throw notFound(this.definition.label);
      this.assertPublishAllowed(req, input, current);
      await this.definition.validate?.(tx, input, current);
      const before = await this.toRecord(tx, current);
      const slug = await this.resolveSlug(tx, input, current);
      const values = this.columnValues(input, slug, current, req.auth?.user.id ?? null);
      if (hasColumn(this.table, "updatedBy")) values.updatedBy = req.auth?.user.id ?? null;
      if (this.definition.seo) {
        values.seoId = await upsertSeo(
          tx,
          (current.seoId as string | null) ?? null,
          input.seo as never,
        );
      }
      const [row] = (await tx
        .update(this.table)
        .set(values as never)
        .where(eq(this.col("id"), id))
        .returning()) as Row[];
      if (!row) throw notFound(this.definition.label);
      await this.definition.saveRelations?.(tx, id, input);
      const after = await this.toRecord(tx, row);
      await recordAudit(tx, req, {
        action: `${this.definition.entityType}.update`,
        entityType: this.definition.entityType,
        entityId: id,
        summary: `Updated ${this.definition.label.toLowerCase()} "${this.titleOf(row)}"`,
        before,
        after,
      });
      return after;
    });
    this.deps.revalidator.contentChanged(`${this.definition.entityType}:update`);
    return record;
  }

  async remove(req: Request, id: string): Promise<void> {
    await this.deps.db.transaction(async (tx) => {
      const row = await this.find(tx, id);
      if (!row) throw notFound(this.definition.label);
      await this.definition.beforeDelete?.(tx, row);
      const before = await this.toRecord(tx, row);
      await tx.delete(this.table).where(eq(this.col("id"), id));
      if (this.definition.seo && row.seoId)
        await tx.delete(seoMetadata).where(eq(seoMetadata.id, row.seoId as string));
      await recordAudit(tx, req, {
        action: `${this.definition.entityType}.delete`,
        entityType: this.definition.entityType,
        entityId: id,
        summary: `Deleted ${this.definition.label.toLowerCase()} "${this.titleOf(row)}"`,
        before,
      });
    });
    this.deps.revalidator.contentChanged(`${this.definition.entityType}:delete`);
  }

  async setStatus(req: Request, id: string, status: string): Promise<Record<string, unknown>> {
    if (!this.editorial) throw notFound("Endpoint");
    const record = await this.deps.db.transaction(async (tx) => {
      const current = await this.find(tx, id);
      if (!current) throw notFound(this.definition.label);
      const [row] = (await tx
        .update(this.table)
        .set({
          status,
          publishedAt: resolvePublishedAt(
            status,
            null,
            (current.publishedAt as Date | null) ?? null,
          ),
        } as never)
        .where(eq(this.col("id"), id))
        .returning()) as Row[];
      if (!row) throw notFound(this.definition.label);
      await recordAudit(tx, req, {
        action: `${this.definition.entityType}.status`,
        entityType: this.definition.entityType,
        entityId: id,
        summary: `${status === "published" ? "Published" : status === "archived" ? "Archived" : "Unpublished"} ${this.definition.label.toLowerCase()} "${this.titleOf(row)}"`,
        before: { status: current.status },
        after: { status },
      });
      return this.toRecord(tx, row);
    });
    this.deps.revalidator.contentChanged(`${this.definition.entityType}:status`);
    return record;
  }

  async reorder(req: Request, ids: string[]): Promise<void> {
    if (!this.orderable) throw notFound("Endpoint");
    await this.deps.db.transaction(async (tx) => {
      await reorderRows(tx, this.table, ids);
      await recordAudit(tx, req, {
        action: `${this.definition.entityType}.reorder`,
        entityType: this.definition.entityType,
        summary: `Reordered ${ids.length} ${this.definition.label.toLowerCase()} items`,
        after: { ids },
      });
    });
    this.deps.revalidator.contentChanged(`${this.definition.entityType}:reorder`);
  }

  bulkValues(action: BulkAction): Record<string, unknown> | null {
    switch (action) {
      case "publish":
        return this.editorial
          ? { status: "published", publishedAt: sql`coalesce(published_at, now())` }
          : null;
      case "unpublish":
        return this.editorial ? { status: "draft" } : null;
      case "archive":
        return this.editorial ? { status: "archived" } : null;
      case "feature":
      case "unfeature":
        return this.featurable ? { featured: action === "feature" } : null;
      case "show":
      case "hide":
        return this.visibleToggle ? { isVisible: action === "show" } : null;
      default:
        return null;
    }
  }

  async bulk(req: Request, ids: string[], action: BulkAction) {
    const failed: { id: string; message: string }[] = [];
    const succeeded: string[] = [];
    if (action === "delete") {
      for (const id of ids) {
        try {
          await this.remove(req, id);
          succeeded.push(id);
        } catch (error) {
          failed.push({
            id,
            message: error instanceof AppError ? error.message : "Could not delete",
          });
        }
      }
      return { succeeded, failed };
    }
    const values = this.bulkValues(action);
    if (!values)
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        `"${action}" does not apply to ${this.definition.label.toLowerCase()} items`,
      );
    await this.deps.db.transaction(async (tx) => {
      const rows = (await tx
        .update(this.table)
        .set(values as never)
        .where(inArray(this.col("id"), ids))
        .returning({ id: this.col("id") })) as { id: string }[];
      succeeded.push(...rows.map((row) => row.id));
      await recordAudit(tx, req, {
        action: `${this.definition.entityType}.bulk_${action}`,
        entityType: this.definition.entityType,
        summary: `Bulk ${action} on ${rows.length} ${this.definition.label.toLowerCase()} items`,
        after: { ids: succeeded },
      });
    });
    for (const id of ids) if (!succeeded.includes(id)) failed.push({ id, message: "Not found" });
    this.deps.revalidator.contentChanged(`${this.definition.entityType}:bulk`);
    return { succeeded, failed };
  }

  titleOf(row: Row): string {
    return String(row.title ?? row.name ?? row.label ?? row.position ?? row.degree ?? row.id).slice(
      0,
      120,
    );
  }
}

/** Standard admin routes for a resource. Every route checks permissions server-side. */
export function resourceRouter<TInput extends Record<string, unknown>>(
  service: ResourceService<TInput>,
  extend?: (router: Router) => void,
): Router {
  const router = Router();
  const permissions = permissionsFor(
    service.definition as ResourceDefinition<Record<string, unknown>>,
  );
  // Malformed ids are "not found", not database errors.
  router.param("id", (_req, _res, next, value: string) => {
    next(UUID_PATTERN.test(value) ? undefined : notFound(service.definition.label));
  });
  extend?.(router);

  router.get("/", requirePermission(permissions.read), async (req, res) => {
    const query = parse(adminListQuery, req.query);
    const { items, meta } = await service.list(service.deps.db, query);
    ok(res, items, meta);
  });

  if (service.orderable) {
    router.post("/reorder", requirePermission(permissions.write), async (req, res) => {
      const input = parse(reorderInput, req.body);
      await service.reorder(req, input.ids);
      noContent(res);
    });
  }

  router.post("/bulk", async (req, res) => {
    const input = parse(bulkInput, req.body);
    const needed = input.action === "delete" ? permissions.remove : permissions.publish;
    if (!has(req, needed)) throw forbidden();
    ok(res, await service.bulk(req, input.ids, input.action));
  });

  router.get("/:id", requirePermission(permissions.read), async (req, res) => {
    const row = await service.find(service.deps.db, String(req.params.id));
    if (!row) throw notFound(service.definition.label);
    ok(res, await service.toRecord(service.deps.db, row));
  });

  router.post("/", requirePermission(permissions.write), async (req, res) => {
    created(res, await service.create(req, req.body));
  });

  router.put("/:id", requirePermission(permissions.write), async (req, res) => {
    ok(res, await service.update(req, String(req.params.id), req.body));
  });

  if (service.editorial) {
    router.post("/:id/status", requirePermission(permissions.publish), async (req, res) => {
      const input = parse(statusChangeInput, req.body);
      ok(res, await service.setStatus(req, String(req.params.id), input.status));
    });
  }

  router.delete("/:id", requirePermission(permissions.remove), async (req, res) => {
    await service.remove(req, String(req.params.id));
    noContent(res);
  });

  return router;
}

export function defineResource<TInput extends Record<string, unknown>>(
  definition: ResourceDefinition<TInput>,
): ResourceDefinition<TInput> {
  return definition;
}

export { asc, desc };

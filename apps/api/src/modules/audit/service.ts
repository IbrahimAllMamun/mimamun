import type { Request } from "express";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { AuditLogDTO } from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import { auditLogs, users } from "../../database/schema";
import { iso, isoRequired } from "../../lib/http";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "csrfToken",
  "currentPassword",
  "newPassword",
]);
const MAX_JSON_BYTES = 20_000;

function sanitize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (typeof value === "object") {
    if (depth > 6) return "[nested]";
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) continue;
      result[key] = sanitize(item, depth + 1);
    }
    return result;
  }
  return value;
}

function bounded(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  const json = JSON.stringify(value);
  if (json.length <= MAX_JSON_BYTES) return value;
  const keys = typeof value === "object" ? Object.keys(value as object) : [];
  return { truncated: true, bytes: json.length, keys };
}

/** Keeps only the fields that changed between two snapshots. */
export function diffSnapshots(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): { before: Record<string, unknown> | null; after: Record<string, unknown> | null } {
  if (!before || !after) return { before, after };
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (key === "updatedAt") continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedBefore[key] = before[key];
      changedAfter[key] = after[key];
    }
  }
  return { before: changedBefore, after: changedAfter };
}

export interface AuditEntry {
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  /** Overrides the actor (used for authentication events without a session). */
  actor?: { id: string | null; email: string | null; name: string | null };
}

export async function recordAudit(
  db: DbExecutor,
  req: Request | null,
  entry: AuditEntry,
): Promise<void> {
  const before = sanitize(entry.before ?? null) as Record<string, unknown> | null;
  const after = sanitize(entry.after ?? null) as Record<string, unknown> | null;
  const isObject = (value: unknown) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const diff =
    isObject(before) && isObject(after) ? diffSnapshots(before, after) : { before, after };
  const actor =
    entry.actor ??
    (req?.auth
      ? { id: req.auth.user.id, email: req.auth.user.email, name: req.auth.user.name }
      : { id: null, email: null, name: null });
  await db.insert(auditLogs).values({
    userId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name,
    action: entry.action,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    summary: entry.summary?.slice(0, 500) ?? null,
    previousValue: bounded(diff.before),
    newValue: bounded(diff.after),
    ipAddress: req?.ip ?? null,
    userAgent: req?.header("user-agent")?.slice(0, 300) ?? null,
  });
}

export async function listAuditLogs(
  db: DbExecutor,
  query: {
    q?: string | null;
    entityType?: string | null;
    userId?: string | null;
    action?: string | null;
    page: number;
    pageSize: number;
  },
): Promise<{ items: AuditLogDTO[]; total: number }> {
  const filters: SQL[] = [];
  if (query.entityType) filters.push(eq(auditLogs.entityType, query.entityType));
  if (query.userId) filters.push(eq(auditLogs.userId, query.userId));
  if (query.action) filters.push(eq(auditLogs.action, query.action));
  if (query.q) {
    const term = `%${query.q.replace(/[%_\\]/g, "\\$&")}%`;
    const search = or(
      ilike(auditLogs.summary, term),
      ilike(auditLogs.actorEmail, term),
      ilike(auditLogs.action, term),
    );
    if (search) filters.push(search);
  }
  const where = filters.length ? and(...filters) : undefined;
  const [rows, [totalRow]] = await Promise.all([
    db
      .select({ log: auditLogs, userName: users.name })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ value: count() }).from(auditLogs).where(where),
  ]);
  return {
    items: rows.map(({ log, userName }) => toAuditDTO(log, userName)),
    total: totalRow?.value ?? 0,
  };
}

export function toAuditDTO(
  log: typeof auditLogs.$inferSelect,
  userName: string | null,
): AuditLogDTO {
  return {
    id: log.id,
    actor: { id: log.userId, name: userName ?? log.actorName, email: log.actorEmail },
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    summary: log.summary,
    previousValue: log.previousValue,
    newValue: log.newValue,
    ipAddress: log.ipAddress,
    createdAt: isoRequired(log.createdAt),
  };
}

export { iso };

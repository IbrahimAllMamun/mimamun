import { and, eq, gt, isNull, lt, ne, or, sql } from "drizzle-orm";
import { isPermission, type Permission } from "@portfolio/shared";
import type { AppConfig } from "../../config/env";
import type { Database, DbExecutor } from "../../database/client";
import { rolePermissions, roles, sessions, users } from "../../database/schema";
import { randomToken, sha256Hex } from "../../lib/crypto";
import type { AuthContext } from "../../types";

/** Refresh `last_seen_at` at most this often to avoid a write per request. */
const TOUCH_INTERVAL_MS = 60_000;

export interface CreatedSession {
  token: string;
  id: string;
  csrfToken: string;
  expiresAt: Date;
}

export async function createSession(
  db: DbExecutor,
  config: AppConfig["session"],
  userId: string,
  meta: { ipAddress: string | null; userAgent: string | null },
): Promise<CreatedSession> {
  const token = randomToken(32);
  const id = sha256Hex(token);
  const csrfToken = randomToken(32);
  const expiresAt = new Date(Date.now() + config.ttlHours * 3_600_000);
  await db.insert(sessions).values({
    id,
    userId,
    csrfToken,
    expiresAt,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
  });
  return { token, id, csrfToken, expiresAt };
}

export async function loadSession(
  db: Database,
  config: AppConfig["session"],
  token: string,
): Promise<AuthContext | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const id = sha256Hex(token);
  const idleCutoff = new Date(Date.now() - config.idleTimeoutHours * 3_600_000);
  const rows = await db
    .select({
      sessionId: sessions.id,
      csrfToken: sessions.csrfToken,
      expiresAt: sessions.expiresAt,
      lastSeenAt: sessions.lastSeenAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      roleId: roles.id,
      roleKey: roles.key,
      roleName: roles.name,
      permissions: sql<string[]>`coalesce(array_agg(${rolePermissions.permission}) filter (where ${rolePermissions.permission} is not null), '{}')`,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(roles, eq(roles.id, users.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(
      and(
        eq(sessions.id, id),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
        gt(sessions.lastSeenAt, idleCutoff),
        eq(users.status, "active"),
      ),
    )
    .groupBy(sessions.id, users.id, roles.id);
  const row = rows[0];
  if (!row) return null;
  if (Date.now() - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
  }
  return {
    sessionId: row.sessionId,
    csrfToken: row.csrfToken,
    expiresAt: row.expiresAt,
    user: {
      id: row.userId,
      email: row.email,
      name: row.name,
      roleId: row.roleId,
      roleKey: row.roleKey,
      roleName: row.roleName,
    },
    permissions: row.permissions.filter(isPermission) as Permission[],
  };
}

export async function revokeSession(db: DbExecutor, sessionId: string): Promise<void> {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
}

/** Revokes every session of a user, optionally keeping one (the caller's). */
export async function revokeUserSessions(db: DbExecutor, userId: string, exceptSessionId?: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        exceptSessionId ? ne(sessions.id, exceptSessionId) : undefined,
      ),
    );
}

/** Deletes expired or long-revoked sessions (run by the scheduler). */
export async function purgeSessions(db: DbExecutor): Promise<number> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const deleted = await db
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, new Date()), lt(sessions.revokedAt, weekAgo)))
    .returning({ id: sessions.id });
  return deleted.length;
}

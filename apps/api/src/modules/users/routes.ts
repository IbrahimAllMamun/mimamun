import { Router } from "express";
import { and, asc, count, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import {
  PERMISSIONS,
  roleInput,
  userCreateInput,
  userUpdateInput,
  type AdminUserDTO,
  type Permission,
  type RoleDTO,
  type SessionListItemDTO,
} from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import { rolePermissions, roles, sessions, users } from "../../database/schema";
import { requireAuth, requirePermission } from "../../middleware/auth";
import { conflict, forbidden, notFound } from "../../lib/errors";
import { created, iso, isoRequired, noContent, ok, parse } from "../../lib/http";
import { hashPassword } from "../../lib/password";
import { UUID_PATTERN } from "../../lib/resource";
import { describeUserAgent } from "../../lib/user-agent";
import type { AppDeps } from "../../types";
import { recordAudit } from "../audit/service";
import { revokeSession, revokeUserSessions } from "../auth/sessions";

async function listRoles(db: DbExecutor): Promise<RoleDTO[]> {
  const rows = await db
    .select({
      role: roles,
      permissions: sql<string[]>`coalesce(array_agg(distinct ${rolePermissions.permission}) filter (where ${rolePermissions.permission} is not null), '{}')`,
      userCount: sql<number>`(select count(*)::int from ${users} where ${users.roleId} = ${roles.id})`,
    })
    .from(roles)
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .groupBy(roles.id)
    .orderBy(desc(roles.isSystem), asc(roles.name));
  return rows.map(({ role, permissions, userCount }) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: permissions as Permission[],
    userCount,
  }));
}

function toUserDTO(row: { user: typeof users.$inferSelect; role: typeof roles.$inferSelect }): AdminUserDTO {
  return {
    id: row.user.id,
    email: row.user.email,
    name: row.user.name,
    status: row.user.status,
    role: { id: row.role.id, key: row.role.key, name: row.role.name },
    lastLoginAt: iso(row.user.lastLoginAt),
    lockedUntil: iso(row.user.lockedUntil),
    createdAt: isoRequired(row.user.createdAt),
  };
}

/** Counts active users holding users:manage (to prevent locking everyone out). */
async function countActiveManagers(db: DbExecutor, excludeUserId?: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, users.roleId))
    .where(
      and(
        eq(users.status, "active"),
        eq(rolePermissions.permission, PERMISSIONS.USERS_MANAGE),
        excludeUserId ? ne(users.id, excludeUserId) : undefined,
      ),
    );
  return row?.value ?? 0;
}

async function roleGrantsUserManagement(db: DbExecutor, roleId: string): Promise<boolean> {
  const [row] = await db
    .select({ value: count() })
    .from(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permission, PERMISSIONS.USERS_MANAGE)));
  return (row?.value ?? 0) > 0;
}

export function usersRouter(deps: AppDeps): Router {
  const router = Router();
  const { db } = deps;
  const manage = requirePermission(PERMISSIONS.USERS_MANAGE);
  router.param("id", (_req, _res, next, value: string) => next(UUID_PATTERN.test(value) ? undefined : notFound("Record")));

  // ── Users ──────────────────────────────────────────────────────────────
  router.get("/users", manage, async (_req, res) => {
    const rows = await db
      .select({ user: users, role: roles })
      .from(users)
      .innerJoin(roles, eq(roles.id, users.roleId))
      .orderBy(asc(users.name));
    ok(res, rows.map(toUserDTO));
  });

  router.post("/users", manage, async (req, res) => {
    const input = parse(userCreateInput, req.body);
    const row = await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${input.email}`);
      if (existing) throw conflict("A user with this email already exists", [{ path: "email", message: "Already in use" }]);
      const [role] = await tx.select().from(roles).where(eq(roles.id, input.roleId));
      if (!role) throw notFound("Role");
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          name: input.name,
          roleId: input.roleId,
          passwordHash: await hashPassword(input.password),
          passwordChangedAt: new Date(),
        })
        .returning();
      await recordAudit(tx, req, {
        action: "user.create",
        entityType: "user",
        entityId: user!.id,
        summary: `Created user ${input.email} (${role.name})`,
        after: { email: input.email, name: input.name, role: role.key },
      });
      return { user: user!, role };
    });
    created(res, toUserDTO(row));
  });

  router.put("/users/:id", manage, async (req, res) => {
    const input = parse(userUpdateInput, req.body);
    const id = String(req.params.id);
    const row = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(users).where(eq(users.id, id)).for("update");
      if (!current) throw notFound("User");
      const [role] = await tx.select().from(roles).where(eq(roles.id, input.roleId));
      if (!role) throw notFound("Role");
      const losesManagement =
        (await roleGrantsUserManagement(tx, current.roleId)) &&
        (input.status !== "active" || !(await roleGrantsUserManagement(tx, input.roleId)));
      if (losesManagement && (await countActiveManagers(tx, id)) === 0) {
        throw conflict("At least one active user must be able to manage users");
      }
      const [updated] = await tx
        .update(users)
        .set({ name: input.name, roleId: input.roleId, status: input.status })
        .where(eq(users.id, id))
        .returning();
      if (input.status !== "active" || input.roleId !== current.roleId) await revokeUserSessions(tx, id);
      await recordAudit(tx, req, {
        action: "user.update",
        entityType: "user",
        entityId: id,
        summary: `Updated user ${current.email}`,
        before: { name: current.name, roleId: current.roleId, status: current.status },
        after: { name: input.name, roleId: input.roleId, status: input.status },
      });
      return { user: updated!, role };
    });
    ok(res, toUserDTO(row));
  });

  router.delete("/users/:id", manage, async (req, res) => {
    const id = String(req.params.id);
    if (id === req.auth!.user.id) throw forbidden("You cannot delete your own account");
    await db.transaction(async (tx) => {
      const [current] = await tx.select().from(users).where(eq(users.id, id));
      if (!current) throw notFound("User");
      if ((await roleGrantsUserManagement(tx, current.roleId)) && (await countActiveManagers(tx, id)) === 0) {
        throw conflict("At least one active user must be able to manage users");
      }
      await tx.delete(users).where(eq(users.id, id));
      await recordAudit(tx, req, {
        action: "user.delete",
        entityType: "user",
        entityId: id,
        summary: `Deleted user ${current.email}`,
        before: { email: current.email, name: current.name },
      });
    });
    noContent(res);
  });

  router.post("/users/:id/unlock", manage, async (req, res) => {
    const id = String(req.params.id);
    const [updated] = await db
      .update(users)
      .set({ lockedUntil: null, failedLoginCount: 0 })
      .where(eq(users.id, id))
      .returning({ email: users.email });
    if (!updated) throw notFound("User");
    await recordAudit(db, req, { action: "user.unlock", entityType: "user", entityId: id, summary: `Unlocked ${updated.email}` });
    noContent(res);
  });

  // ── Roles ──────────────────────────────────────────────────────────────
  router.get("/roles", manage, async (_req, res) => ok(res, await listRoles(db)));

  const saveRole = async (tx: DbExecutor, roleId: string, permissions: string[]) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (permissions.length) {
      await tx.insert(rolePermissions).values([...new Set(permissions)].map((permission) => ({ roleId, permission })));
    }
  };

  router.post("/roles", manage, async (req, res) => {
    const input = parse(roleInput, req.body);
    await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, input.key));
      if (existing) throw conflict("A role with this key already exists", [{ path: "key", message: "Already in use" }]);
      const [role] = await tx
        .insert(roles)
        .values({ key: input.key, name: input.name, description: input.description })
        .returning();
      await saveRole(tx, role!.id, input.permissions);
      await recordAudit(tx, req, {
        action: "role.create",
        entityType: "role",
        entityId: role!.id,
        summary: `Created role ${input.name}`,
        after: input,
      });
    });
    created(res, await listRoles(db));
  });

  router.put("/roles/:id", manage, async (req, res) => {
    const input = parse(roleInput, req.body);
    const id = String(req.params.id);
    await db.transaction(async (tx) => {
      const [role] = await tx.select().from(roles).where(eq(roles.id, id)).for("update");
      if (!role) throw notFound("Role");
      if (role.isSystem && (input.key !== role.key || !input.permissions.includes(PERMISSIONS.USERS_MANAGE))) {
        throw conflict("The Administrator role keeps its key and the users:manage permission");
      }
      const before = await listRoles(tx);
      await tx.update(roles).set({ key: input.key, name: input.name, description: input.description }).where(eq(roles.id, id));
      await saveRole(tx, id, input.permissions);
      if (!input.permissions.includes(PERMISSIONS.USERS_MANAGE) && (await countActiveManagers(tx)) === 0) {
        throw conflict("At least one active user must be able to manage users");
      }
      await recordAudit(tx, req, {
        action: "role.update",
        entityType: "role",
        entityId: id,
        summary: `Updated role ${input.name}`,
        before: before.find((item) => item.id === id) ?? null,
        after: input,
      });
    });
    ok(res, await listRoles(db));
  });

  router.delete("/roles/:id", manage, async (req, res) => {
    const id = String(req.params.id);
    await db.transaction(async (tx) => {
      const [role] = await tx.select().from(roles).where(eq(roles.id, id));
      if (!role) throw notFound("Role");
      if (role.isSystem) throw conflict("System roles cannot be deleted");
      const [assigned] = await tx.select({ value: count() }).from(users).where(eq(users.roleId, id));
      if ((assigned?.value ?? 0) > 0) throw conflict("Reassign this role's users before deleting it");
      await tx.delete(roles).where(eq(roles.id, id));
      await recordAudit(tx, req, { action: "role.delete", entityType: "role", entityId: id, summary: `Deleted role ${role.name}` });
    });
    noContent(res);
  });

  // ── Sessions ───────────────────────────────────────────────────────────
  router.get("/sessions", requireAuth, async (req, res) => {
    const auth = req.auth!;
    const canManage = auth.permissions.includes(PERMISSIONS.USERS_MANAGE);
    const rows = await db
      .select({ session: sessions, user: { id: users.id, name: users.name, email: users.email } })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
          canManage ? undefined : eq(sessions.userId, auth.user.id),
        ),
      )
      .orderBy(desc(sessions.lastSeenAt));
    const items: SessionListItemDTO[] = rows.map(({ session, user }) => ({
      id: session.id,
      user,
      createdAt: isoRequired(session.createdAt),
      lastSeenAt: isoRequired(session.lastSeenAt),
      expiresAt: isoRequired(session.expiresAt),
      ipAddress: session.ipAddress,
      userAgent: describeUserAgent(session.userAgent),
      current: session.id === auth.sessionId,
    }));
    ok(res, items);
  });

  router.delete("/sessions/:sessionId", requireAuth, async (req, res) => {
    const auth = req.auth!;
    const sessionId = String(req.params.sessionId);
    if (!/^[a-f0-9]{64}$/.test(sessionId)) throw notFound("Session");
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    if (!session) throw notFound("Session");
    if (session.userId !== auth.user.id && !auth.permissions.includes(PERMISSIONS.USERS_MANAGE)) throw forbidden();
    await revokeSession(db, sessionId);
    await recordAudit(db, req, {
      action: "session.revoke",
      entityType: "user",
      entityId: session.userId,
      summary: session.id === auth.sessionId ? "Signed out current session" : "Revoked a session",
    });
    noContent(res);
  });

  return router;
}

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, timestamps, timestamptz } from "./_helpers";
import { userStatusEnum } from "./enums";

export const roles = pgTable("roles", {
  id: id(),
  key: text().notNull().unique(),
  name: text().notNull(),
  description: text().notNull().default(""),
  /** System roles (ADMIN) cannot be deleted or stripped of user management. */
  isSystem: boolean().notNull().default(false),
  ...timestamps(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permission: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permission] })],
);

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text().notNull(),
    name: text().notNull(),
    passwordHash: text().notNull(),
    roleId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    status: userStatusEnum().notNull().default("active"),
    failedLoginCount: integer().notNull().default(0),
    lockedUntil: timestamptz(),
    lastLoginAt: timestamptz(),
    passwordChangedAt: timestamptz(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
    index("users_role_idx").on(t.roleId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 (hex) of the random cookie token. The raw token is never stored. */
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    csrfToken: text().notNull(),
    ipAddress: inet(),
    userAgent: text(),
    createdAt: createdAt(),
    lastSeenAt: timestamptz().notNull().defaultNow(),
    expiresAt: timestamptz().notNull(),
    revokedAt: timestamptz(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text().notNull().unique(),
    expiresAt: timestamptz().notNull(),
    usedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [index("password_reset_tokens_user_idx").on(t.userId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    /** Snapshot so the log stays readable after the user is deleted. */
    actorEmail: text(),
    actorName: text(),
    action: text().notNull(),
    entityType: text(),
    entityId: text(),
    summary: text(),
    previousValue: jsonb(),
    newValue: jsonb(),
    ipAddress: inet(),
    userAgent: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt.desc()),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_user_idx").on(t.userId),
    check("audit_logs_action_not_empty", sql`length(${t.action}) > 0`),
  ],
);

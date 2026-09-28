import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { SessionDTO } from "@portfolio/shared";
import type { AppConfig } from "../../config/env";
import type { Database } from "../../database/client";
import { passwordResetTokens, users } from "../../database/schema";
import { randomToken, sha256Hex } from "../../lib/crypto";
import { AppError, rateLimited } from "../../lib/errors";
import { isoRequired } from "../../lib/http";
import { hashPassword, timingSafeDummyHash, verifyPassword } from "../../lib/password";
import type { AuthContext } from "../../types";

const INVALID_CREDENTIALS = new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export type LoginResult =
  | { ok: true; userId: string; email: string; name: string }
  | { ok: false; error: AppError; userId: string | null };

/**
 * Verifies credentials with constant-ish timing, a per-account lockout and a
 * deliberately generic error so the response does not reveal whether an
 * account exists, is disabled or is locked.
 */
export async function verifyCredentials(
  db: Database,
  config: AppConfig["login"],
  email: string,
  password: string,
): Promise<LoginResult> {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);

  if (!user) {
    await verifyPassword(await timingSafeDummyHash(), password);
    return { ok: false, error: INVALID_CREDENTIALS, userId: null };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    // Spend the same hashing time so a locked account is not distinguishable by timing.
    await verifyPassword(await timingSafeDummyHash(), password);
    const seconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
    return {
      ok: false,
      error: rateLimited("Too many sign-in attempts. Try again in a few minutes.", seconds),
      userId: user.id,
    };
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid || user.status !== "active") {
    const failures = user.failedLoginCount + 1;
    const lock = failures >= config.maxAttempts;
    await db
      .update(users)
      .set({
        failedLoginCount: lock ? 0 : failures,
        lockedUntil: lock ? new Date(Date.now() + config.lockoutMinutes * 60_000) : user.lockedUntil,
      })
      .where(eq(users.id, user.id));
    return { ok: false, error: INVALID_CREDENTIALS, userId: user.id };
  }

  await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));
  return { ok: true, userId: user.id, email: user.email, name: user.name };
}

export function toSessionDTO(auth: AuthContext): SessionDTO {
  return {
    user: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      role: { id: auth.user.roleId, key: auth.user.roleKey, name: auth.user.roleName },
      permissions: auth.permissions,
    },
    csrfToken: auth.csrfToken,
    expiresAt: isoRequired(auth.expiresAt),
  };
}

/** Creates a single-use reset token (stored hashed). Returns null if the account cannot reset. */
export async function createPasswordResetToken(
  db: Database,
  email: string,
): Promise<{ token: string; userId: string; name: string; email: string } | null> {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, status: users.status })
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
  if (!user || user.status !== "active") return null;
  // Invalidate any outstanding tokens so only the newest link works.
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
  const token = randomToken(32);
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: sha256Hex(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  return { token, userId: user.id, name: user.name, email: user.email };
}

/** Consumes a reset token and sets the new password. Returns the user id. */
export async function resetPasswordWithToken(db: Database, token: string, newPassword: string): Promise<string> {
  const passwordHash = await hashPassword(newPassword);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, sha256Hex(token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .for("update");
    if (!row) {
      throw new AppError(400, "VALIDATION_ERROR", "This reset link is invalid or has expired. Request a new one.");
    }
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
    await tx
      .update(users)
      .set({ passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null })
      .where(eq(users.id, row.userId));
    return row.userId;
  });
}

export async function changePassword(
  db: Database,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId));
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AppError(400, "VALIDATION_ERROR", "Current password is incorrect", [
      { path: "currentPassword", message: "Current password is incorrect" },
    ]);
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() })
    .where(eq(users.id, userId));
}

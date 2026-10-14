import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { safeNext, type GoogleSignInError } from "@portfolio/shared";
import type { Database } from "../../database/client";
import { users } from "../../database/schema";
import type { GoogleIdentity } from "../../integrations/google";
import { hmacHex, randomToken, safeEqual } from "../../lib/crypto";

/** How long the browser may take between leaving for Google and coming back. */
export const GOOGLE_FLOW_MAX_AGE_MS = 10 * 60 * 1000;

/** Per-sign-in secrets kept in a short-lived, signed, HttpOnly cookie. */
export interface GoogleFlow {
  state: string;
  nonce: string;
  codeVerifier: string;
  next: string;
  issuedAt: number;
}

export function newGoogleFlow(next: unknown): GoogleFlow {
  return {
    state: randomToken(32),
    nonce: randomToken(32),
    codeVerifier: randomToken(48),
    next: safeNext(typeof next === "string" ? next : null),
    issuedAt: Date.now(),
  };
}

/** PKCE S256 challenge for a verifier. */
export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function sealGoogleFlow(secret: string, flow: GoogleFlow): string {
  const payload = Buffer.from(JSON.stringify(flow)).toString("base64url");
  return `${payload}.${hmacHex(secret, `google-flow:${payload}`)}`;
}

/** Returns the flow when the cookie is authentic and recent, otherwise null. */
export function openGoogleFlow(
  secret: string,
  value: string | undefined,
  now = Date.now(),
): GoogleFlow | null {
  if (!value || value.length > 2000) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  if (!safeEqual(signature, hmacHex(secret, `google-flow:${payload}`))) return null;
  try {
    const flow = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleFlow;
    const age = now - flow.issuedAt;
    if (typeof flow.issuedAt !== "number" || age < 0 || age > GOOGLE_FLOW_MAX_AGE_MS) return null;
    return { ...flow, next: safeNext(flow.next) };
  } catch {
    return null;
  }
}

export type GoogleUserResult =
  | { ok: true; userId: string; email: string; linked: boolean }
  | { ok: false; error: GoogleSignInError; userId: string | null };

/**
 * Finds the admin account for a Google identity. An account already linked to
 * the Google account id wins; otherwise an active account with the same
 * (Google-verified) email is linked on first use. Accounts are never created.
 */
export async function resolveGoogleUser(
  db: Database,
  identity: GoogleIdentity,
): Promise<GoogleUserResult> {
  const [linked] = await db.select().from(users).where(eq(users.googleSubject, identity.subject));
  if (linked) {
    if (linked.status !== "active") {
      return { ok: false, error: "google_no_account", userId: linked.id };
    }
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, linked.id));
    return { ok: true, userId: linked.id, email: linked.email, linked: false };
  }

  if (!identity.emailVerified) return { ok: false, error: "google_no_account", userId: null };
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${identity.email.toLowerCase()}`);
  if (!user || user.status !== "active") {
    return { ok: false, error: "google_no_account", userId: user?.id ?? null };
  }
  if (user.googleSubject) return { ok: false, error: "google_conflict", userId: user.id };
  await db
    .update(users)
    .set({ googleSubject: identity.subject, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));
  return { ok: true, userId: user.id, email: user.email, linked: true };
}

export async function unlinkGoogle(db: Database, userId: string): Promise<boolean> {
  const updated = await db
    .update(users)
    .set({ googleSubject: null })
    .where(sql`${users.id} = ${userId} and ${users.googleSubject} is not null`)
    .returning({ id: users.id });
  return updated.length > 0;
}

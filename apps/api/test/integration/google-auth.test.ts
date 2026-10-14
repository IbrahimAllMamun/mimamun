import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { auditLogs, users } from "../../src/database/schema";
import { codeChallenge } from "../../src/modules/auth/google";
import {
  ADMIN,
  createTestContext,
  createUser,
  login,
  resetDatabase,
  type TestContext,
} from "../helpers/context";
import { TEST_ORIGIN } from "../helpers/env";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext();
  await resetDatabase(ctx.deps);
});
afterAll(() => ctx.close());
beforeEach(() => {
  ctx.google.identity = null;
  ctx.google.calls = [];
  ctx.deps.google = ctx.google;
});

const identity = (email: string, subject = `sub-${email}`) => ({
  subject,
  email,
  emailVerified: true,
});

/** Starts the flow and returns the agent (holding the flow cookie) and Google's query. */
async function start(next?: string) {
  const agent = request.agent(ctx.app);
  const response = await agent
    .get("/api/auth/google")
    .query(next ? { next } : {})
    .expect(302);
  const location = new URL(response.headers.location!);
  return { agent, response, params: location.searchParams };
}

async function finish(next?: string) {
  const flow = await start(next);
  const callback = await flow.agent
    .get("/api/auth/google/callback")
    .query({ code: "auth-code", state: flow.params.get("state")! })
    .expect(302);
  return { ...flow, callback };
}

const loginError = (location: string | undefined) =>
  new URL(location ?? "", TEST_ORIGIN).searchParams.get("error");

describe("Google sign-in", () => {
  it("reports whether Google sign-in is available", async () => {
    const enabled = await request(ctx.app).get("/api/auth/providers").expect(200);
    expect(enabled.body.data).toEqual({ google: true });
    ctx.deps.google = null;
    const disabled = await request(ctx.app).get("/api/auth/providers").expect(200);
    expect(disabled.body.data).toEqual({ google: false });
    const redirect = await request(ctx.app).get("/api/auth/google").expect(302);
    expect(loginError(redirect.headers.location)).toBe("google_unavailable");
  });

  it("sends the browser to Google with state, nonce and a PKCE challenge", async () => {
    const { response, params } = await start("/admin/projects");
    expect(params.get("state")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(params.get("nonce")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const cookie = String(response.headers["set-cookie"]);
    expect(cookie).toContain("portfolio_google=");
    expect(cookie).toContain("Path=/api/auth/google");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("signs in an existing account, links it and returns to the requested page", async () => {
    ctx.google.identity = identity(ADMIN.email.toUpperCase(), "google-admin");
    const { agent, params, callback } = await finish("/admin/projects?status=draft");
    expect(callback.headers.location).toBe(`${TEST_ORIGIN}/admin/projects?status=draft`);
    expect(String(callback.headers["set-cookie"])).toContain("portfolio_session=");

    const [call] = ctx.google.calls;
    expect(call?.nonce).toBe(params.get("nonce"));
    expect(codeChallenge(call!.codeVerifier)).toBe(params.get("code_challenge"));

    const session = await agent.get("/api/auth/session").expect(200);
    expect(session.body.data.user.email).toBe(ADMIN.email);
    expect(session.body.data.user.googleLinked).toBe(true);
    const [user] = await ctx.deps.db.select().from(users).where(eq(users.email, ADMIN.email));
    expect(user?.googleSubject).toBe("google-admin");
  });

  it("finds a linked account by Google id even when the Google email changed", async () => {
    ctx.google.identity = identity("renamed@gmail.test", "google-admin");
    const { agent, callback } = await finish();
    expect(callback.headers.location).toBe(`${TEST_ORIGIN}/admin`);
    const session = await agent.get("/api/auth/session").expect(200);
    expect(session.body.data.user.email).toBe(ADMIN.email);
  });

  it("refuses a different Google account for an already linked email", async () => {
    ctx.google.identity = identity(ADMIN.email, "someone-else");
    const { callback } = await finish();
    expect(loginError(callback.headers.location)).toBe("google_conflict");
    expect(String(callback.headers["set-cookie"])).not.toContain("portfolio_session=");
  });

  it("never creates accounts and refuses unverified or disabled ones", async () => {
    ctx.google.identity = identity("stranger@example.com");
    expect(loginError((await finish()).callback.headers.location)).toBe("google_no_account");

    const editor = await createUser(ctx.deps, "EDITOR", "unverified@test.local");
    ctx.google.identity = { ...identity(editor.email), emailVerified: false };
    expect(loginError((await finish()).callback.headers.location)).toBe("google_no_account");

    const disabled = await createUser(ctx.deps, "EDITOR", "disabled@test.local");
    await ctx.deps.db.update(users).set({ status: "disabled" }).where(eq(users.id, disabled.id));
    ctx.google.identity = identity(disabled.email);
    expect(loginError((await finish()).callback.headers.location)).toBe("google_no_account");

    const failures = await ctx.deps.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "auth.login_failed"));
    expect(failures.some((row) => row.summary?.includes("stranger@example.com"))).toBe(true);
  });

  it("rejects a callback without the flow cookie or with another state", async () => {
    ctx.google.identity = identity(ADMIN.email, "google-admin");
    const { params } = await start();
    const noCookie = await request(ctx.app)
      .get("/api/auth/google/callback")
      .query({ code: "auth-code", state: params.get("state")! })
      .expect(302);
    expect(loginError(noCookie.headers.location)).toBe("google_failed");

    const flow = await start();
    const wrongState = await flow.agent
      .get("/api/auth/google/callback")
      .query({ code: "auth-code", state: "forged-state" })
      .expect(302);
    expect(loginError(wrongState.headers.location)).toBe("google_failed");
    expect(ctx.google.calls).toHaveLength(0);

    // The flow cookie is single use.
    const replay = await flow.agent
      .get("/api/auth/google/callback")
      .query({ code: "auth-code", state: flow.params.get("state")! })
      .expect(302);
    expect(loginError(replay.headers.location)).toBe("google_failed");
  });

  it("handles a cancelled consent screen and a failed token exchange", async () => {
    const cancelled = await start("/admin/media");
    const response = await cancelled.agent
      .get("/api/auth/google/callback")
      .query({ error: "access_denied", state: cancelled.params.get("state")! })
      .expect(302);
    const location = new URL(response.headers.location!);
    expect(location.searchParams.get("error")).toBe("google_cancelled");
    expect(location.searchParams.get("next")).toBe("/admin/media");

    ctx.google.identity = null;
    expect(loginError((await finish()).callback.headers.location)).toBe("google_failed");
  });

  it("does not redirect off-site after sign-in", async () => {
    ctx.google.identity = identity(ADMIN.email, "google-admin");
    const { callback } = await finish("https://evil.example/admin");
    expect(callback.headers.location).toBe(`${TEST_ORIGIN}/admin`);
  });

  it("lets a signed-in user unlink their Google account", async () => {
    const session = await login(ctx.app, ADMIN);
    await session.agent.delete("/api/auth/google/link").set({ Origin: TEST_ORIGIN }).expect(403);
    await session.agent.delete("/api/auth/google/link").set(session.headers).expect(204);
    const after = await session.agent.get("/api/auth/session").expect(200);
    expect(after.body.data.user.googleLinked).toBe(false);
    await request(ctx.app).delete("/api/auth/google/link").set("Origin", TEST_ORIGIN).expect(401);

    // The next Google sign-in links whichever Google account owns the email.
    ctx.google.identity = identity(ADMIN.email, "someone-else");
    const { callback } = await finish();
    expect(callback.headers.location).toBe(`${TEST_ORIGIN}/admin`);
  });
});

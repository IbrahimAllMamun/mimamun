import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
  ctx = await createTestContext({ LOGIN_MAX_ATTEMPTS: "3", LOGIN_LOCKOUT_MINUTES: "10" });
  await resetDatabase(ctx.deps);
});
afterAll(() => ctx.close());

describe("authentication", () => {
  it("signs in with valid credentials and returns the session with a CSRF token", async () => {
    const response = await request(ctx.app)
      .post("/api/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send(ADMIN)
      .expect(200);
    expect(response.body.data.user.email).toBe(ADMIN.email);
    expect(response.body.data.user.permissions).toContain("users:manage");
    expect(response.body.data.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const cookie = String(response.headers["set-cookie"]);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("uses one generic message for unknown emails and wrong passwords", async () => {
    const unknown = await request(ctx.app)
      .post("/api/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: "nobody@test.local", password: "whatever-password" })
      .expect(401);
    const wrong = await request(ctx.app)
      .post("/api/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: ADMIN.email, password: "wrong-password-123" })
      .expect(401);
    expect(unknown.body.error).toEqual(wrong.body.error);
    expect(unknown.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("locks an account after repeated failures", async () => {
    const user = await createUser(ctx.deps, "EDITOR", "lockme@test.local");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(ctx.app)
        .post("/api/auth/login")
        .set("Origin", TEST_ORIGIN)
        .send({ email: user.email, password: "not-the-password" })
        .expect(401);
    }
    const locked = await request(ctx.app)
      .post("/api/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: user.email, password: user.password })
      .expect(429);
    expect(locked.body.error.code).toBe("RATE_LIMITED");
    expect(locked.headers["retry-after"]).toBeDefined();
  });

  it("answers the same for a locked account and an unknown address", async () => {
    const user = await createUser(ctx.deps, "EDITOR", "enumeration@test.local");
    const attempt = (email: string) =>
      request(ctx.app)
        .post("/api/auth/login")
        .set("Origin", TEST_ORIGIN)
        .send({ email, password: "not-the-password" });
    const existing: number[] = [];
    const missing: number[] = [];
    for (let round = 0; round < 5; round += 1) {
      existing.push((await attempt(user.email)).status);
      missing.push((await attempt("nobody-here@test.local")).status);
    }
    expect(existing).toEqual(missing);
    expect(existing.at(-1)).toBe(429);
  });

  it("rejects cross-site login attempts", async () => {
    const response = await request(ctx.app)
      .post("/api/auth/login")
      .set("Origin", "https://evil.example")
      .send(ADMIN)
      .expect(403);
    expect(response.body.error.code).toBe("CSRF_INVALID");
  });

  it("returns 401 for the session endpoint without a cookie", async () => {
    await request(ctx.app).get("/api/auth/session").expect(401);
  });

  it("logs out and revokes the session server-side", async () => {
    const session = await login(ctx.app, ADMIN);
    await session.agent.get("/api/auth/session").expect(200);
    await session.agent.post("/api/auth/logout").set(session.headers).expect(204);
    await session.agent.get("/api/auth/session").expect(401);
  });

  it("changes the password and signs out other sessions", async () => {
    const user = await createUser(ctx.deps, "EDITOR", "changer@test.local");
    const first = await login(ctx.app, user);
    const second = await login(ctx.app, user);
    await first.agent
      .post("/api/auth/password/change")
      .set(first.headers)
      .send({ currentPassword: user.password, newPassword: "a brand new passphrase" })
      .expect(200);
    await first.agent.get("/api/auth/session").expect(200);
    await second.agent.get("/api/auth/session").expect(401);
  });

  it("rejects a wrong current password when changing it", async () => {
    const session = await login(ctx.app, ADMIN);
    const response = await session.agent
      .post("/api/auth/password/change")
      .set(session.headers)
      .send({ currentPassword: "not-correct-password", newPassword: "another new passphrase" })
      .expect(400);
    expect(response.body.error.details[0].path).toBe("currentPassword");
  });
});

describe("password reset", () => {
  it("responds identically for known and unknown emails", async () => {
    const known = await request(ctx.app)
      .post("/api/auth/password/forgot")
      .set("Origin", TEST_ORIGIN)
      .send({ email: ADMIN.email })
      .expect(202);
    const unknown = await request(ctx.app)
      .post("/api/auth/password/forgot")
      .set("Origin", TEST_ORIGIN)
      .send({ email: "ghost@test.local" })
      .expect(202);
    expect(known.body).toEqual(unknown.body);
  });

  it("resets with a single-use emailed token and revokes sessions", async () => {
    const user = await createUser(ctx.deps, "EDITOR", "reset@test.local");
    const session = await login(ctx.app, user);
    ctx.mailer.outbox.length = 0;
    await request(ctx.app)
      .post("/api/auth/password/forgot")
      .set("Origin", TEST_ORIGIN)
      .send({ email: user.email })
      .expect(202);
    const mail = ctx.mailer.outbox.find((message) => message.to === user.email);
    expect(mail).toBeDefined();
    const token = decodeURIComponent(/token=([^\s]+)/.exec(mail!.text)![1]!);
    await request(ctx.app)
      .post("/api/auth/password/reset")
      .set("Origin", TEST_ORIGIN)
      .send({ token, password: "reset passphrase value" })
      .expect(200);
    await session.agent.get("/api/auth/session").expect(401);
    await login(ctx.app, { email: user.email, password: "reset passphrase value" });
    const reuse = await request(ctx.app)
      .post("/api/auth/password/reset")
      .set("Origin", TEST_ORIGIN)
      .send({ token, password: "second reset attempt" })
      .expect(400);
    expect(reuse.body.error.message).toMatch(/invalid or has expired/);
  });
});

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN, createTestContext, login, resetDatabase, type Session, type TestContext } from "../helpers/context";

let ctx: TestContext;
let admin: Session;

beforeAll(async () => {
  ctx = await createTestContext();
  await resetDatabase(ctx.deps);
  admin = await login(ctx.app, ADMIN);
});
afterAll(() => ctx.close());

const repo = (id: number, name: string) => ({
  id,
  name,
  full_name: `IbrahimAllMamun/${name}`,
  owner: { login: "IbrahimAllMamun" },
  description: `${name} description`,
  html_url: `https://github.com/IbrahimAllMamun/${name}`,
  homepage: null,
  language: "Python",
  topics: ["statistics"],
  stargazers_count: 3,
  forks_count: 1,
  fork: false,
  archived: false,
  pushed_at: "2026-09-01T10:00:00Z",
});

describe("GitHub integration", () => {
  it("syncs, curates and serves repositories from the cache", async () => {
    ctx.github.repositories = [repo(1, "flood-lstm"), repo(2, "scratch")];
    await admin.agent.post("/api/admin/integrations/github/sync").set(admin.headers).expect(200);
    const listing = await admin.agent.get("/api/admin/integrations/github").expect(200);
    expect(listing.body.data.repositories).toHaveLength(2);
    const target = listing.body.data.repositories.find((item: { name: string }) => item.name === "flood-lstm");
    await admin.agent
      .patch(`/api/admin/integrations/github/repositories/${target.id}`)
      .set(admin.headers)
      .send({ isSelected: true, displayOrder: 0, customDescription: "LSTM experiments" })
      .expect(200);
    const publicList = await request(ctx.app).get("/api/public/github").expect(200);
    expect(publicList.body.data.repositories).toHaveLength(1);
    expect(publicList.body.data.repositories[0]).toMatchObject({ name: "flood-lstm", description: "LSTM experiments" });
  });

  it("keeps cached data and records the error when GitHub fails", async () => {
    ctx.github.fail = new Error("GitHub request failed: rate limit exceeded");
    const response = await admin.agent.post("/api/admin/integrations/github/sync").set(admin.headers).expect(502);
    expect(response.body.error.message).toContain("last synced data");
    const publicList = await request(ctx.app).get("/api/public/github").expect(200);
    expect(publicList.body.data.repositories).toHaveLength(1);
    const status = await admin.agent.get("/api/admin/integrations/github").expect(200);
    expect(status.body.data.status.lastError).toContain("rate limit");
    ctx.github.fail = null;
  });
});

describe("security behaviour", () => {
  it("sets defensive headers and hides the framework", async () => {
    const response = await request(ctx.app).get("/api/health").expect(200);
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("exposes only minimal health information", async () => {
    const db = await request(ctx.app).get("/api/health/db").expect(200);
    expect(Object.keys(db.body.data).sort()).toEqual(["latencyMs", "status"]);
  });

  it("returns the error envelope without stack traces", async () => {
    const malformed = await request(ctx.app)
      .post("/api/public/contact")
      .set("Content-Type", "application/json")
      .send('{"name": ')
      .expect(400);
    expect(malformed.body).toEqual({ success: false, error: { code: "VALIDATION_ERROR", message: "Malformed JSON body" } });
    const missing = await request(ctx.app).get("/api/nope").expect(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(missing.body)).not.toMatch(/at .*\.ts/);
  });

  it("rejects oversized JSON bodies", async () => {
    await admin.agent
      .post("/api/admin/projects")
      .set(admin.headers)
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ title: "x", summary: "y", padding: "z".repeat(3 * 1024 * 1024) }))
      .expect(413);
  });

  it("treats SQL metacharacters in search as plain text", async () => {
    const response = await request(ctx.app).get("/api/public/search").query({ q: "'; DROP TABLE projects; --" }).expect(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    await request(ctx.app).get("/api/public/projects").query({ q: "%' OR 1=1 --", tech: "R' OR '1'='1" }).expect(200);
    const projects = await request(ctx.app).get("/api/public/projects").expect(200);
    expect(projects.body.data.length).toBeGreaterThan(0);
  });

  it("stores HTML as inert text and rejects script URLs", async () => {
    const created = await admin.agent
      .post("/api/admin/projects")
      .set(admin.headers)
      .send({ title: "<img src=x onerror=alert(1)>", summary: "<script>alert(1)</script>" })
      .expect(201);
    expect(created.body.data.slug).toBe("img-src-x-onerror-alert-1");
    await admin.agent
      .post("/api/admin/social-links")
      .set(admin.headers)
      .send({ platform: "website", label: "Bad", url: "javascript:alert(1)" })
      .expect(400);
  });

  it("does not leak drafts through search or sitemap", async () => {
    await admin.agent.post("/api/admin/projects").set(admin.headers).send({ title: "Secret draft zebra", summary: "Unpublished" }).expect(201);
    const search = await request(ctx.app).get("/api/public/search?q=zebra").expect(200);
    expect(search.body.data).toHaveLength(0);
    const sitemap = await request(ctx.app).get("/api/public/sitemap").expect(200);
    expect(JSON.stringify(sitemap.body)).not.toContain("secret-draft-zebra");
  });
});

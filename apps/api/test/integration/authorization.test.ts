import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ADMIN,
  createTestContext,
  createUser,
  login,
  resetDatabase,
  type Session,
  type TestContext,
} from "../helpers/context";

let ctx: TestContext;
let admin: Session;
let editor: Session;

beforeAll(async () => {
  ctx = await createTestContext();
  await resetDatabase(ctx.deps);
  admin = await login(ctx.app, ADMIN);
  editor = await login(ctx.app, await createUser(ctx.deps, "EDITOR", "editor@test.local"));
});
afterAll(() => ctx.close());

const draft = { title: "Authorization test project", summary: "Checks permissions." };

describe("server-side authorization", () => {
  it("rejects anonymous access to every admin area", async () => {
    for (const path of [
      "/api/admin/projects",
      "/api/admin/dashboard",
      "/api/admin/users",
      "/api/admin/media",
      "/api/admin/audit-logs",
      "/api/admin/system",
    ]) {
      const response = await request(ctx.app).get(path).expect(401);
      expect(response.body.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("lets editors create and publish content", async () => {
    const created = await editor.agent
      .post("/api/admin/projects")
      .set(editor.headers)
      .send(draft)
      .expect(201);
    await editor.agent
      .post(`/api/admin/projects/${created.body.data.id}/status`)
      .set(editor.headers)
      .send({ status: "published" })
      .expect(200);
  });

  it("does not let editors delete content or manage users, roles, settings or audit logs", async () => {
    const created = await editor.agent
      .post("/api/admin/projects")
      .set(editor.headers)
      .send(draft)
      .expect(201);
    await editor.agent
      .delete(`/api/admin/projects/${created.body.data.id}`)
      .set(editor.headers)
      .expect(403);
    await editor.agent.get("/api/admin/users").expect(403);
    await editor.agent.get("/api/admin/roles").expect(403);
    await editor.agent.get("/api/admin/settings").expect(403);
    await editor.agent.get("/api/admin/audit-logs").expect(403);
    await editor.agent.get("/api/admin/messages").expect(403);
    await editor.agent
      .post("/api/admin/users")
      .set(editor.headers)
      .send({
        email: "x@test.local",
        name: "X",
        roleId: created.body.data.id,
        password: "long enough password",
      })
      .expect(403);
  });

  it("enforces custom roles without publish permission", async () => {
    const roles = await admin.agent
      .post("/api/admin/roles")
      .set(admin.headers)
      .send({
        key: "WRITER",
        name: "Writer",
        description: "Drafts only",
        permissions: ["content:read", "content:write"],
      })
      .expect(201);
    expect(roles.body.data.some((role: { key: string }) => role.key === "WRITER")).toBe(true);
    const writer = await login(ctx.app, await createUser(ctx.deps, "WRITER", "writer@test.local"));
    const created = await writer.agent
      .post("/api/admin/projects")
      .set(writer.headers)
      .send(draft)
      .expect(201);
    await writer.agent
      .post("/api/admin/projects")
      .set(writer.headers)
      .send({ ...draft, status: "published" })
      .expect(403);
    await writer.agent
      .post(`/api/admin/projects/${created.body.data.id}/status`)
      .set(writer.headers)
      .send({ status: "published" })
      .expect(403);
    await writer.agent
      .put(`/api/admin/projects/${created.body.data.id}`)
      .set(writer.headers)
      .send({ ...draft, featured: true })
      .expect(403);
    await writer.agent
      .post("/api/admin/projects/bulk")
      .set(writer.headers)
      .send({ ids: [created.body.data.id], action: "publish" })
      .expect(403);
  });

  it("never lets the last user manager lose access", async () => {
    const users = await admin.agent.get("/api/admin/users").expect(200);
    const self = users.body.data.find((user: { email: string }) => user.email === ADMIN.email);
    const roles = await admin.agent.get("/api/admin/roles").expect(200);
    const editorRole = roles.body.data.find((role: { key: string }) => role.key === "EDITOR");
    await admin.agent
      .put(`/api/admin/users/${self.id}`)
      .set(admin.headers)
      .send({ name: "Admin", roleId: editorRole.id, status: "active" })
      .expect(409);
    await admin.agent.delete(`/api/admin/users/${self.id}`).set(admin.headers).expect(403);
    const adminRole = roles.body.data.find((role: { key: string }) => role.key === "ADMIN");
    await admin.agent.delete(`/api/admin/roles/${adminRole.id}`).set(admin.headers).expect(409);
  });

  it("disabling a user revokes their sessions immediately", async () => {
    const user = await createUser(ctx.deps, "EDITOR", "disable-me@test.local");
    const session = await login(ctx.app, user);
    const roles = await admin.agent.get("/api/admin/roles").expect(200);
    const editorRole = roles.body.data.find((role: { key: string }) => role.key === "EDITOR");
    await admin.agent
      .put(`/api/admin/users/${user.id}`)
      .set(admin.headers)
      .send({ name: "Disabled", roleId: editorRole.id, status: "disabled" })
      .expect(200);
    await session.agent.get("/api/auth/session").expect(401);
  });

  it("requires the session's CSRF token on writes", async () => {
    await admin.agent
      .post("/api/admin/projects")
      .set({ Origin: admin.headers.Origin })
      .send(draft)
      .expect(403);
    await admin.agent
      .post("/api/admin/projects")
      .set({ ...admin.headers, "X-CSRF-Token": "forged" })
      .send(draft)
      .expect(403);
    await admin.agent
      .post("/api/admin/projects")
      .set({ "X-CSRF-Token": admin.csrf })
      .send(draft)
      .expect(403);
  });
});

import request from "supertest";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyticsEvents, contactMessages, siteSettings } from "../../src/database/schema";
import { ADMIN, createTestContext, login, resetDatabase, type Session, type TestContext } from "../helpers/context";

let ctx: TestContext;
let admin: Session;
const browser = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

async function token(): Promise<string> {
  const response = await request(ctx.app).get("/api/public/contact/token").expect(200);
  return response.body.data.token as string;
}

const message = {
  name: "Recruiter Example",
  email: "recruiter@example.com",
  subject: "Data scientist role",
  message: "Hello, we are hiring a data scientist for our credit analytics team.",
};

beforeAll(async () => {
  ctx = await createTestContext();
  await resetDatabase(ctx.deps);
  admin = await login(ctx.app, ADMIN);
});
afterAll(() => ctx.close());

describe("contact form", () => {
  it("stores a valid message and notifies the owner", async () => {
    ctx.mailer.outbox.length = 0;
    await request(ctx.app).post("/api/public/contact").send({ ...message, token: await token(), website: "" }).expect(201);
    const [row] = await ctx.deps.db.select().from(contactMessages).where(eq(contactMessages.email, message.email));
    expect(row).toMatchObject({ status: "new", subject: message.subject });
    expect(row?.ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row?.notifiedAt).toBeTruthy();
    expect(ctx.mailer.outbox[0]).toMatchObject({ to: "mimamun@isrt.ac.bd", replyTo: message.email });
  });

  it("silently discards honeypot submissions", async () => {
    await request(ctx.app)
      .post("/api/public/contact")
      .send({ ...message, email: "bot@example.com", token: await token(), website: "http://spam.example" })
      .expect(201);
    const rows = await ctx.deps.db.select().from(contactMessages).where(eq(contactMessages.email, "bot@example.com"));
    expect(rows).toHaveLength(0);
  });

  it("marks submissions with forged tokens as spam", async () => {
    await request(ctx.app)
      .post("/api/public/contact")
      .send({ ...message, email: "forged@example.com", token: "123.abc" })
      .expect(201);
    const [row] = await ctx.deps.db.select().from(contactMessages).where(eq(contactMessages.email, "forged@example.com"));
    expect(row?.status).toBe("spam");
  });

  it("validates fields", async () => {
    const response = await request(ctx.app).post("/api/public/contact").send({ name: "A", email: "no", subject: "", message: "hi" }).expect(400);
    expect(response.body.error.details.map((detail: { path: string }) => detail.path).sort()).toEqual(["email", "message", "subject"]);
  });

  it("rate limits repeated submissions", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const response = await request(ctx.app).post("/api/public/contact").send({ ...message, token: await token() });
      statuses.push(response.status);
    }
    expect(statuses).toContain(429);
  });

  it("lets admins read and triage messages", async () => {
    const list = await admin.agent.get("/api/admin/messages?status=new").expect(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    const id = list.body.data[0].id;
    const opened = await admin.agent.get(`/api/admin/messages/${id}`).expect(200);
    expect(opened.body.data.status).toBe("read");
    await admin.agent.patch(`/api/admin/messages/${id}`).set(admin.headers).send({ status: "replied" }).expect(200);
  });
});

describe("analytics", () => {
  const send = (body: object, headers: Record<string, string> = {}) =>
    request(ctx.app).post("/api/analytics/events").set("User-Agent", browser).set(headers).send(body);

  it("records anonymous page views without IPs or cookies", async () => {
    await send({ type: "page_view", path: "/projects/flood-event-prediction-bangladesh?utm=x", referrer: "https://www.google.com/" }).expect(204);
    const [event] = await ctx.deps.db.select().from(analyticsEvents);
    expect(event).toMatchObject({
      type: "page_view",
      path: "/projects/flood-event-prediction-bangladesh",
      entityType: "project",
      referrerHost: "google.com",
      device: "desktop",
      browser: "Chrome",
    });
    expect(JSON.stringify(event)).not.toContain("127.0.0.1");
  });

  it("respects Do Not Track, Global Privacy Control and bots", async () => {
    await ctx.deps.db.delete(analyticsEvents);
    await send({ type: "page_view", path: "/" }, { DNT: "1" }).expect(204);
    await send({ type: "page_view", path: "/" }, { "Sec-GPC": "1" }).expect(204);
    await request(ctx.app).post("/api/analytics/events").set("User-Agent", "Googlebot/2.1").send({ type: "page_view", path: "/" }).expect(204);
    expect(await ctx.deps.db.select().from(analyticsEvents)).toHaveLength(0);
  });

  it("never counts admin screens or draft previews", async () => {
    await ctx.deps.db.delete(analyticsEvents);
    await send({ type: "page_view", path: "/admin/projects" }).expect(204);
    await send({ type: "page_view", path: "/preview/projects/0b0e3c1e-5f5d-4a4b-9a57-2c1f3d9e8a10" }).expect(204);
    expect(await ctx.deps.db.select().from(analyticsEvents)).toHaveLength(0);
  });

  it("stops recording when analytics is disabled", async () => {
    await ctx.deps.db.update(siteSettings).set({ analyticsEnabled: false });
    await send({ type: "page_view", path: "/about" }).expect(204);
    expect(await ctx.deps.db.select().from(analyticsEvents)).toHaveLength(0);
    await ctx.deps.db.update(siteSettings).set({ analyticsEnabled: true });
  });

  it("rejects malformed events", async () => {
    await send({ type: "page_view", path: "https://evil.example/" }).expect(400);
    await send({ type: "keylogger", path: "/" }).expect(400);
  });

  it("summarises traffic for admins", async () => {
    await send({ type: "page_view", path: "/" }).expect(204);
    await send({ type: "download", path: "/research", target: "/media/2026/09/x.pdf" }).expect(204);
    const summary = await admin.agent.get("/api/admin/analytics/summary?days=7").expect(200);
    expect(summary.body.data.totals).toMatchObject({ pageViews: 1, visitors: 1, downloads: 1 });
    expect(summary.body.data.daily).toHaveLength(8);
  });
});

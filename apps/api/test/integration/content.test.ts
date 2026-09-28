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

const caseStudy = {
  title: "Credit risk early warning",
  summary: "Monitoring signals for small-business loans.",
  type: "professional",
  technologies: ["R", "SQL"],
  tags: ["Credit risk", "Monitoring"],
  metrics: [{ label: "Portfolio covered", value: "100", unit: "%", context: "illustrative test value" }],
  sections: {
    problem: [{ id: "p1", type: "paragraph", data: { markdown: "Late signals of **distress**." } }],
    results: [
      {
        id: "c1",
        type: "chart",
        data: {
          title: "Validation AUC",
          description: "Area under the ROC curve by model",
          chartType: "bar",
          data: { x: ["Logit", "GBM"], series: [{ name: "AUC", values: [0.71, 0.78] }] },
        },
      },
    ],
  },
};

describe("content lifecycle", () => {
  let projectId: string;

  it("creates a draft with sections, tags and metrics", async () => {
    const response = await admin.agent.post("/api/admin/projects").set(admin.headers).send(caseStudy).expect(201);
    projectId = response.body.data.id;
    expect(response.body.data.slug).toBe("credit-risk-early-warning");
    expect(response.body.data.status).toBe("draft");
    expect(response.body.data.tags).toEqual(["Credit risk", "Monitoring"]);
    expect(response.body.data.metrics).toHaveLength(1);
    expect(response.body.data.sections.results[0].type).toBe("chart");
  });

  it("keeps drafts out of the public API but available in preview", async () => {
    await request(ctx.app).get("/api/public/projects/credit-risk-early-warning").expect(404);
    const list = await request(ctx.app).get("/api/public/projects").expect(200);
    expect(list.body.data.map((item: { slug: string }) => item.slug)).not.toContain("credit-risk-early-warning");
    const preview = await admin.agent.get(`/api/admin/preview/projects/${projectId}`).expect(200);
    expect(preview.body.data.sections.map((section: { key: string }) => section.key)).toEqual(["problem", "results"]);
    expect(preview.body.data.status).toBe("draft");
  });

  it("publishes, then serves the case study publicly with facets", async () => {
    const published = await admin.agent
      .post(`/api/admin/projects/${projectId}/status`)
      .set(admin.headers)
      .send({ status: "published" })
      .expect(200);
    expect(published.body.data.publishedAt).toBeTruthy();
    const detail = await request(ctx.app).get("/api/public/projects/credit-risk-early-warning").expect(200);
    expect(detail.body.data.metrics[0].value).toBe("100");
    expect(detail.body.data.tags.map((tag: { slug: string }) => tag.slug)).toEqual(["credit-risk", "monitoring"]);
    const list = await request(ctx.app).get("/api/public/projects?tech=R").expect(200);
    expect(list.body.data.map((item: { slug: string }) => item.slug)).toEqual(["credit-risk-early-warning"]);
    expect(list.body.meta.facets.technologies).toEqual(expect.arrayContaining([{ name: "R", count: 1 }]));
    expect(ctx.revalidator.calls.length).toBeGreaterThan(0);
  });

  it("finds published content through full-text search", async () => {
    const results = await request(ctx.app).get("/api/public/search?q=distress").expect(200);
    expect(results.body.data[0]).toMatchObject({ type: "project", url: "/projects/credit-risk-early-warning" });
    const filtered = await request(ctx.app).get("/api/public/projects?q=warning").expect(200);
    expect(filtered.body.data).toHaveLength(1);
  });

  it("hides unlisted content from lists but serves it by URL", async () => {
    await admin.agent.put(`/api/admin/projects/${projectId}`).set(admin.headers).send({ ...caseStudy, status: "published", visibility: "unlisted" }).expect(200);
    const list = await request(ctx.app).get("/api/public/projects").expect(200);
    expect(list.body.data.map((item: { slug: string }) => item.slug)).not.toContain("credit-risk-early-warning");
    await request(ctx.app).get("/api/public/projects/credit-risk-early-warning").expect(200);
  });

  it("keeps slugs stable and unique", async () => {
    const second = await admin.agent.post("/api/admin/projects").set(admin.headers).send(caseStudy).expect(201);
    expect(second.body.data.slug).toBe("credit-risk-early-warning-2");
    const conflict = await admin.agent
      .put(`/api/admin/projects/${second.body.data.id}`)
      .set(admin.headers)
      .send({ ...caseStudy, slug: "credit-risk-early-warning" })
      .expect(409);
    expect(conflict.body.error.details[0].path).toBe("slug");
    const renamed = await admin.agent
      .put(`/api/admin/projects/${projectId}`)
      .set(admin.headers)
      .send({ ...caseStudy, title: "A new title", status: "published" })
      .expect(200);
    expect(renamed.body.data.slug).toBe("credit-risk-early-warning");
  });

  it("returns field-level validation errors", async () => {
    const response = await admin.agent
      .post("/api/admin/projects")
      .set(admin.headers)
      .send({ title: "", summary: "x", githubUrl: "javascript:alert(1)", sections: { problem: [{ id: "x", type: "chart", data: {} }] } })
      .expect(400);
    const paths = response.body.error.details.map((detail: { path: string }) => detail.path);
    expect(paths).toContain("title");
    expect(paths).toContain("githubUrl");
    expect(paths.some((path: string) => path.startsWith("sections.problem.0"))).toBe(true);
  });

  it("rejects references to media that does not exist", async () => {
    const response = await admin.agent
      .post("/api/admin/projects")
      .set(admin.headers)
      .send({ ...caseStudy, title: "Missing image", coverMediaId: "5b0f3c3e-8f7a-4f44-9d2a-1c6a2b3c4d5e" })
      .expect(400);
    expect(response.body.error.details[0].path).toBe("coverMediaId");
  });

  it("applies bulk actions and reports failures", async () => {
    const list = await admin.agent.get("/api/admin/projects").expect(200);
    const ids = list.body.data.map((item: { id: string }) => item.id);
    const response = await admin.agent
      .post("/api/admin/projects/bulk")
      .set(admin.headers)
      .send({ ids: [...ids, "5b0f3c3e-8f7a-4f44-9d2a-1c6a2b3c4d5e"], action: "feature" })
      .expect(200);
    expect(response.body.data.succeeded).toHaveLength(ids.length);
    expect(response.body.data.failed).toHaveLength(1);
  });

  it("reorders and deletes with an audit trail", async () => {
    const list = await admin.agent.get("/api/admin/projects?sort=order").expect(200);
    const ids = list.body.data.map((item: { id: string }) => item.id).reverse();
    await admin.agent.post("/api/admin/projects/reorder").set(admin.headers).send({ ids }).expect(204);
    const reordered = await admin.agent.get("/api/admin/projects?sort=order").expect(200);
    expect(reordered.body.data[0].id).toBe(ids[0]);
    await admin.agent.delete(`/api/admin/projects/${ids[0]}`).set(admin.headers).expect(204);
    const audit = await admin.agent.get("/api/admin/audit-logs?entityType=project").expect(200);
    const actions = audit.body.data.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(expect.arrayContaining(["project.create", "project.update", "project.status", "project.delete", "project.reorder"]));
    const update = audit.body.data.find((entry: { action: string }) => entry.action === "project.update");
    expect(update.previousValue).toBeTruthy();
  });

  it("prevents cycles in the skill category tree", async () => {
    const parent = await admin.agent.post("/api/admin/skill-categories").set(admin.headers).send({ name: "Parent" }).expect(201);
    const child = await admin.agent
      .post("/api/admin/skill-categories")
      .set(admin.headers)
      .send({ name: "Child", parentId: parent.body.data.id })
      .expect(201);
    await admin.agent
      .put(`/api/admin/skill-categories/${parent.body.data.id}`)
      .set(admin.headers)
      .send({ name: "Parent", parentId: child.body.data.id })
      .expect(400);
    await admin.agent.delete(`/api/admin/skill-categories/${parent.body.data.id}`).set(admin.headers).expect(409);
  });

  it("keeps credential children within their parent's provider", async () => {
    const options = await admin.agent.get("/api/admin/options?types=credential-providers,credential-types,credentials").expect(200);
    const [coursera, datacamp] = options.body.data["credential-providers"];
    const type = options.body.data["credential-types"][0];
    const program = await admin.agent
      .post("/api/admin/credentials")
      .set(admin.headers)
      .send({ providerId: coursera.id, typeId: type.id, title: "Test specialization" })
      .expect(201);
    const course = await admin.agent
      .post("/api/admin/credentials")
      .set(admin.headers)
      .send({ providerId: coursera.id, typeId: type.id, title: "Test course", parentId: program.body.data.id })
      .expect(201);
    await admin.agent
      .post("/api/admin/credentials")
      .set(admin.headers)
      .send({ providerId: datacamp.id, typeId: type.id, title: "Wrong parent", parentId: program.body.data.id })
      .expect(400);
    await admin.agent
      .put(`/api/admin/credentials/${program.body.data.id}`)
      .set(admin.headers)
      .send({ providerId: coursera.id, typeId: type.id, title: "Test specialization", parentId: course.body.data.id })
      .expect(400);
    const tree = await request(ctx.app).get("/api/public/certifications").expect(200);
    const provider = tree.body.data.find((item: { slug: string }) => item.slug === "coursera");
    const node = provider.credentials.find((item: { slug: string }) => item.slug === "test-specialization");
    expect(node.children[0].slug).toBe("test-course");
  });
});

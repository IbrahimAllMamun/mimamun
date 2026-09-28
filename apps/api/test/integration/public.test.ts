import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestContext, resetDatabase, type TestContext } from "../helpers/context";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext();
  await resetDatabase(ctx.deps);
});
afterAll(() => ctx.close());

describe("public API with seed data", () => {
  it("serves the site profile and navigation", async () => {
    const response = await request(ctx.app).get("/api/public/site").expect(200);
    const site = response.body.data;
    expect(site.profile.fullName).toBe("Ibrahim All-Mamun");
    expect(site.profile.headline).toBe("Data Scientist");
    expect(site.profile.location).toBe("Gulshan, Dhaka, Bangladesh");
    expect(site.profile.cv).toBeNull();
    expect(site.navigation.header.map((item: { href: string }) => item.href)).not.toContain("/blog");
    expect(site.socialLinks.map((link: { platform: string }) => link.platform)).toEqual(["github", "linkedin", "email"]);
    expect(response.headers["cache-control"]).toContain("max-age=60");
  });

  it("represents City Bank as current and IDLC as ended in August 2026", async () => {
    const response = await request(ctx.app).get("/api/public/experience").expect(200);
    const [current, previous] = response.body.data.experiences;
    expect(current).toMatchObject({ company: "City Bank PLC", position: "Data Scientist", isCurrent: true, startDate: "2026-08-01", endDate: null });
    expect(previous).toMatchObject({ company: "IDLC Finance PLC", position: "Data Analyst", isCurrent: false, endDate: "2026-08-01", startDate: null });
    expect(previous.responsibilities).toContain("Contributed to the Credit Risk Grading model.");
    expect(previous.employmentType).toBeNull();
  });

  it("builds the home page from database content", async () => {
    const response = await request(ctx.app).get("/api/public/home").expect(200);
    const home = response.body.data;
    expect(home.counts).toMatchObject({ projects: 2, research: 2, presentations: 1, credentials: 6, credentialProviders: 3, publications: 0, posts: 0 });
    expect(home.approachSteps.map((step: { title: string }) => step.title)).toEqual([
      "Statistics",
      "Data",
      "Modeling",
      "Analytics",
      "Research",
      "Business impact",
    ]);
    expect(home.currentExperience[0].company).toBe("City Bank PLC");
    expect(home.trajectory.some((item: { kind: string }) => item.kind === "presentation")).toBe(true);
  });

  it("serves research with a citation derived only from known facts", async () => {
    const response = await request(ctx.app).get("/api/public/research/flood-event-prediction-bangladesh-lstm-gru").expect(200);
    const item = response.body.data;
    expect(item.abstract).toBeNull();
    expect(item.sections).toEqual([]);
    expect(item.presentations[0]).toMatchObject({ conferenceShortName: "ICASDS", edition: "3rd", presentationType: "poster", presentedOn: "2025-12-01" });
    expect(item.citation).toBe(
      "All-Mamun, I. (2025). Flood Event Prediction in Bangladesh: A Data-Driven Approach Using LSTM and GRU-Based Recurrent Neural Networks [M.S. project, University of Dhaka].",
    );
  });

  it("serves the credential hierarchy without invented IDs", async () => {
    const response = await request(ctx.app).get("/api/public/certifications").expect(200);
    const providers = response.body.data.map((provider: { name: string; count: number }) => [provider.name, provider.count]);
    expect(providers).toEqual([
      ["Coursera", 1],
      ["DataCamp", 4],
      ["IEEE-CS SBC DU", 1],
    ]);
    const detail = await request(ctx.app).get("/api/public/certifications/google-data-analytics").expect(200);
    expect(detail.body.data).toMatchObject({ credentialCode: null, verificationUrl: null, issuedOn: null });
  });

  it("returns the skill tree without percentages", async () => {
    const response = await request(ctx.app).get("/api/public/about").expect(200);
    const statistics = response.body.data.skills.find((category: { slug: string }) => category.slug === "statistics");
    expect(statistics.skills.map((skill: { name: string }) => skill.name)).toContain("Causal Inference");
    expect(statistics.skills.every((skill: { level: string | null }) => skill.level === null)).toBe(true);
    expect(response.body.data.education[0]).toMatchObject({ degree: "M.S.", gradeValue: 3.5, gradeScale: 4 });
  });

  it("lists sitemap entries for public content", async () => {
    const response = await request(ctx.app).get("/api/public/sitemap").expect(200);
    const paths = response.body.data.map((entry: { path: string }) => entry.path);
    expect(paths).toEqual(expect.arrayContaining(["/projects/flood-event-prediction-bangladesh", "/certifications/sql-fundamentals"]));
  });

  it("returns 404 for unknown or malformed slugs", async () => {
    await request(ctx.app).get("/api/public/projects/does-not-exist").expect(404);
    await request(ctx.app).get("/api/public/projects/..%2F..%2Fetc").expect(404);
    await request(ctx.app).get("/api/public/blog/Not_A_Slug").expect(404);
  });

  it("redirects /cv to the contact page while no CV is uploaded", async () => {
    const response = await request(ctx.app).get("/cv").expect(302);
    expect(response.headers.location).toBe("/contact?topic=cv");
  });
});

import { describe, expect, it } from "vitest";
import {
  blockSchema,
  collectBlockMediaIds,
  experienceInput,
  hostMatches,
  httpUrl,
  isAllowedEmbedUrl,
  linkHref,
  monthDate,
  orderedSections,
  parseVideoUrl,
  PROJECT_SECTIONS,
  projectInput,
  stringList,
  contactInput,
  password,
} from "../src";

const uuid = "5b0f3c3e-8f7a-4f44-9d2a-1c6a2b3c4d5e";

describe("URL safety", () => {
  it("accepts only http(s) URLs", () => {
    expect(httpUrl.safeParse("https://example.com/a").success).toBe(true);
    expect(httpUrl.safeParse("javascript:alert(1)").success).toBe(false);
    expect(httpUrl.safeParse("data:text/html,hi").success).toBe(false);
  });

  it("accepts internal paths, https and mailto links for navigation", () => {
    expect(linkHref.safeParse("/projects").success).toBe(true);
    expect(linkHref.safeParse("mailto:a@b.co").success).toBe(true);
    expect(linkHref.safeParse("//evil.example").success).toBe(false);
    expect(linkHref.safeParse("javascript:alert(1)").success).toBe(false);
  });
});

describe("normalisation", () => {
  it("normalises month dates to the first of the month", () => {
    expect(monthDate.parse("2026-08")).toBe("2026-08-01");
    expect(monthDate.parse("2026-08-17")).toBe("2026-08-01");
    expect(monthDate.safeParse("2026-13").success).toBe(false);
  });

  it("trims, drops blanks and de-duplicates string lists", () => {
    expect(stringList(5, 20).parse([" R ", "", "Python", "R"])).toEqual(["R", "Python"]);
    expect(stringList(1, 20).safeParse(["a", "b"]).success).toBe(false);
  });

  it("enforces the password policy", () => {
    expect(password.safeParse("short").success).toBe(false);
    expect(password.safeParse("aaaaaaaaaaaaaa").success).toBe(false);
    expect(password.safeParse("correct horse battery").success).toBe(true);
  });
});

describe("experience rules", () => {
  const base = { company: "City Bank PLC", position: "Data Scientist" };

  it("rejects an end date on a current role", () => {
    const result = experienceInput.safeParse({ ...base, isCurrent: true, endDate: "2026-09" });
    expect(result.success).toBe(false);
  });

  it("rejects end before start", () => {
    const result = experienceInput.safeParse({ ...base, startDate: "2026-08", endDate: "2025-01" });
    expect(result.success).toBe(false);
  });

  it("accepts an unknown start date", () => {
    const result = experienceInput.safeParse({ ...base, endDate: "2026-08" });
    expect(result.success).toBe(true);
  });
});

describe("content blocks", () => {
  it("validates chart series lengths", () => {
    const chart = {
      id: "c1",
      type: "chart",
      data: {
        title: "Loss",
        description: "Validation loss by epoch",
        data: { x: [1, 2], series: [{ name: "LSTM", values: [0.5] }] },
      },
    };
    expect(blockSchema.safeParse(chart).success).toBe(false);
    chart.data.data.series[0]!.values = [0.5, 0.4];
    expect(blockSchema.safeParse(chart).success).toBe(true);
  });

  it("only allows embeds from allow-listed https hosts", () => {
    expect(isAllowedEmbedUrl("https://public.tableau.com/views/x")).toBe(true);
    expect(isAllowedEmbedUrl("https://someone.shinyapps.io/app")).toBe(true);
    expect(isAllowedEmbedUrl("http://public.tableau.com/views/x")).toBe(false);
    expect(isAllowedEmbedUrl("https://evil.example/embed")).toBe(false);
    expect(hostMatches("shinyapps.io", "*.shinyapps.io")).toBe(false);
  });

  it("parses YouTube and Vimeo URLs into privacy-friendly embeds", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.embedUrl).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")?.id).toBe("dQw4w9WgXcQ");
    expect(parseVideoUrl("https://vimeo.com/123456789")?.provider).toBe("vimeo");
    expect(parseVideoUrl("https://example.com/video")).toBeNull();
  });

  it("collects media ids referenced by blocks", () => {
    const blocks = [
      { id: "1", type: "image", data: { mediaId: uuid, alt: null, caption: null, width: "text" } },
      { id: "2", type: "paragraph", data: { markdown: "Hello" } },
    ].map((block) => blockSchema.parse(block));
    expect(collectBlockMediaIds(blocks)).toEqual([uuid]);
  });
});

describe("projects", () => {
  it("defaults sections and orders non-empty ones", () => {
    const project = projectInput.parse({
      title: "Flood event prediction",
      summary: "LSTM and GRU models for flood events in Bangladesh.",
      sections: { problem: [{ id: "p", type: "paragraph", data: { markdown: "Floods." } }] },
    });
    expect(project.sections.results).toEqual([]);
    expect(project.status).toBe("draft");
    const ordered = orderedSections(PROJECT_SECTIONS, project.sections);
    expect(ordered.map((section) => section.key)).toEqual(["problem"]);
  });
});

describe("contact form", () => {
  it("requires a meaningful message", () => {
    const result = contactInput.safeParse({
      name: "A",
      email: "a@example.com",
      subject: "Hi",
      message: "too short",
    });
    expect(result.success).toBe(false);
  });
});

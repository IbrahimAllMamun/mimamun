import { expect, test } from "@playwright/test";
import { trackErrors } from "../support";

test.describe("public site", () => {
  test("home page presents the current role and never calls the previous one current", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Ibrahim All-Mamun" })).toBeVisible();
    const facts = page.locator("dl").first();
    await expect(facts).toContainText("Data Scientist, City Bank PLC");
    await expect(facts).toContainText("since Aug 2026");
    await expect(facts).toContainText("Data Analyst, IDLC Finance PLC");
    await expect(facts).toContainText("until Aug 2026");
    // The CV lists IDLC as "Present"; no entry about IDLC may say so. Entries
    // are checked one by one: the next entry (City Bank) is rightly "Present".
    const idlcEntries = page.getByRole("listitem").filter({ hasText: "IDLC Finance PLC" });
    await expect(idlcEntries).not.toHaveCount(0);
    for (const entry of await idlcEntries.all()) {
      await expect(entry).not.toContainText("Present");
    }
    expect(errors).toEqual([]);
  });

  test("header navigation reaches every main section", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const [label, heading] of [
      ["Projects", "Projects"],
      ["Research", "Research"],
      ["Experience", "Experience"],
      ["About", "Ibrahim All-Mamun"],
      ["Contact", "Contact"],
    ] as const) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
    }
  });

  test("projects can be filtered and opened as case studies", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("searchbox", { name: "Search" }).fill("flood");
    await expect(page).toHaveURL(/q=flood/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Flood event prediction in Bangladesh" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Flood event prediction in Bangladesh" }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Flood event prediction in Bangladesh" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Projects");
  });

  test("research pages show an academic citation that can be copied", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/research/flood-event-prediction-bangladesh-lstm-gru");
    await expect(page.getByText("[M.S. project, University of Dhaka]")).toBeVisible();
    await expect(
      page.getByText(/3rd International Conference on Applied Statistics and Data Science/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Copy citation" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("All-Mamun, I. (2025).");
  });

  test("experience lists both roles with honest dates", async ({ page }) => {
    await page.goto("/experience");
    const cityBank = page.getByRole("article", { name: /Data Scientist, City Bank PLC/ });
    await expect(cityBank).toContainText("Aug 2026 – Present");
    await expect(cityBank).toContainText("Current role");
    const idlc = page.getByRole("article", { name: /Data Analyst, IDLC Finance PLC/ });
    await expect(idlc).toContainText("Until Aug 2026");
    await expect(idlc).toContainText("Contributed to the Credit Risk Grading model.");
    await expect(idlc).not.toContainText("Present");
  });

  test("certifications are grouped by provider and filterable by type", async ({ page }) => {
    await page.goto("/certifications");
    for (const provider of ["Coursera", "DataCamp", "IEEE-CS SBC DU"]) {
      await expect(page.getByRole("heading", { level: 2, name: provider })).toBeVisible();
    }
    await page
      .getByRole("navigation", { name: "Filter by type" })
      .getByRole("link", { name: /Workshop/ })
      .click();
    await expect(page).toHaveURL(/type=workshop/);
    await expect(
      page.getByRole("link", { name: "Workshop on Introduction to Large Language Models" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "SQL Fundamentals" })).toHaveCount(0);
    await page
      .getByRole("link", { name: "Workshop on Introduction to Large Language Models" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Workshop on Introduction to Large Language Models",
    );
    await expect(page.getByText("IEEE-CS SBC DU").first()).toBeVisible();
  });

  test("site search finds research by keyword", async ({ page }) => {
    await page.goto("/search?q=markov");
    await expect(page.getByRole("status")).toContainText("for “markov”");
    await expect(page.getByRole("link", { name: /Markov/ }).first()).toBeVisible();
  });

  test("unknown pages return 404 with a way back", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page does not exist." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Search the site" })).toBeVisible();
  });

  test("the theme choice persists across pages", async ({ page }) => {
    await page.goto("/about");
    const html = page.locator("html");
    const before = await page.evaluate(() =>
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    );
    await page.getByRole("button", { name: /Switch to (dark|light) theme/ }).click();
    const expected = before === "dark" ? "light" : "dark";
    await expect(html).toHaveAttribute("data-theme", expected);
    await page.goto("/research");
    await expect(html).toHaveAttribute("data-theme", expected);
  });

  test("keyboard users can skip to the content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("the CV link falls back to the contact form while no CV is uploaded", async ({
    page,
    request,
  }) => {
    const profile = await (await request.get("/api/public/site")).json();
    test.skip(Boolean(profile.data.profile.cv), "A CV has been uploaded");
    await page.goto("/cv");
    await expect(page).toHaveURL(/\/contact\?topic=cv/);
    await expect(page.getByRole("status").filter({ hasText: "CV is not available" })).toBeVisible();
    await expect(page.getByLabel("Subject")).toHaveValue("CV request");
  });

  test("sitemap and robots describe the public site", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/projects/flood-event-prediction-bangladesh");
    expect(sitemap).toContain("/research/covariate-dependent-markov-model-internal-migration");
    expect(sitemap).not.toContain("/admin");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap:");
  });

  test("pages carry structured data and social metadata", async ({ page }) => {
    await page.goto("/research/flood-event-prediction-bangladesh-lstm-gru");
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(jsonLd ?? "{}") as { "@graph": { "@type": string }[] };
    expect(data["@graph"].map((node) => node["@type"])).toEqual(
      expect.arrayContaining(["ScholarlyArticle", "BreadcrumbList"]),
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/og\/research\/flood-event-prediction-bangladesh-lstm-gru/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/research\/flood-event-prediction-bangladesh-lstm-gru$/,
    );
    const image = await page.request.get("/og/research/flood-event-prediction-bangladesh-lstm-gru");
    expect(image.headers()["content-type"]).toBe("image/png");
  });
});

test.describe("contact form", () => {
  test("validates fields in place", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Please check the highlighted fields." }),
    ).toBeVisible();
    await expect(page.getByText("Name is required")).toBeVisible();
    await expect(page.getByLabel("Name")).toBeFocused();
    await expect(page.getByLabel("Name")).toHaveAttribute("aria-invalid", "true");
  });

  test("sends a message", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Name").fill("E2E Visitor");
    await page.getByLabel("Email").fill("visitor@example.com");
    await page.getByLabel("Subject").fill("Automated test message");
    await page.getByLabel("Message").fill("This message was sent by the end-to-end test suite.");
    // The form token must be at least a few seconds old, like a human would take.
    await page.waitForTimeout(3200);
    await page.getByRole("button", { name: "Send message" }).click();
    // A second run within the hour may hit the per-visitor limit; both are correct outcomes.
    const outcome = page
      .locator("[role=status], [role=alert]")
      .filter({ hasText: /Message sent|several messages recently/ });
    await expect(outcome).toBeVisible();
  });
});

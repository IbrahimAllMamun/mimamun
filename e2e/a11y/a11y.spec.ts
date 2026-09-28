import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_STATE } from "../support";

const PUBLIC_PAGES = [
  "/",
  "/projects",
  "/projects/flood-event-prediction-bangladesh",
  "/research",
  "/research/flood-event-prediction-bangladesh-lstm-gru",
  "/publications",
  "/experience",
  "/about",
  "/certifications",
  "/certifications/google-data-analytics",
  "/blog",
  "/contact",
  "/search?q=flood",
];

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  return serious.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes
        .map((node) => node.target.join(" "))
        .slice(0, 3)
        .join(", ")})`,
  );
}

test.describe("accessibility (WCAG 2.2 AA, axe)", () => {
  for (const path of PUBLIC_PAGES) {
    for (const scheme of ["light", "dark"] as const) {
      test(`${path} in ${scheme} mode has no serious violations`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        expect(await audit(page)).toEqual([]);
      });
    }
  }

  test("admin sign-in page", async ({ page }) => {
    await page.goto("/admin/login");
    expect(await audit(page)).toEqual([]);
  });

  test.describe("signed in", () => {
    test.use({ storageState: ADMIN_STATE });
    for (const path of [
      "/admin",
      "/admin/projects",
      "/admin/media",
      "/admin/messages",
      "/admin/settings",
    ]) {
      test(`${path} has no serious violations`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        expect(await audit(page)).toEqual([]);
      });
    }
  });
});

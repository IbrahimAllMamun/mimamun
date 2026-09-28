import { expect, test, type Page } from "@playwright/test";

/**
 * Visual regression at the six reference viewports. Screenshots cover the
 * first screen of each page (what a visitor sees before scrolling), with
 * time-dependent regions masked. Update baselines with
 * `npm run test:visual:update` after an intended design change.
 */
const VIEWPORTS = [
  { name: "360", width: 360, height: 740 },
  { name: "430", width: 430, height: 932 },
  { name: "820", width: 820, height: 1180 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
] as const;

const PAGES = [
  { name: "home", path: "/" },
  { name: "project", path: "/projects/flood-event-prediction-bangladesh" },
  { name: "research", path: "/research/flood-event-prediction-bangladesh-lstm-gru" },
  { name: "experience", path: "/experience" },
  { name: "certifications", path: "/certifications" },
  { name: "admin-login", path: "/admin/login" },
] as const;

function masks(page: Page) {
  // The footer year and anything positioned against "now" change over time.
  return [page.locator("footer"), page.locator("figure", { hasText: "Trajectory" })];
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name}px`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "light",
    });
    for (const target of PAGES) {
      test(target.name, async ({ page }) => {
        await page.goto(target.path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`${target.name}-${viewport.name}.png`, {
          mask: masks(page),
        });
      });
    }
  });
}

test.describe("dark theme", () => {
  test.use({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
  for (const target of PAGES.slice(0, 3)) {
    test(target.name, async ({ page }) => {
      await page.goto(target.path);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${target.name}-1440-dark.png`, { mask: masks(page) });
    });
  }
});

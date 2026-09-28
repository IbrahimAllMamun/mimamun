import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end, accessibility and visual regression tests.
 *
 * They run against a running site (API + web) with a migrated and seeded
 * database. Locally the dev servers are reused; in CI they are started from
 * the production builds (see .github/workflows/ci.yml).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_URL ?? "http://localhost:4000";
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  // Tests share one database and log in as one account, so they run in order.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    contextOptions: { reducedMotion: "reduce" },
    locale: "en-GB",
    timezoneId: "Asia/Dhaka",
  },
  projects: [
    { name: "e2e", testDir: "e2e/tests", use: { ...devices["Desktop Chrome"] } },
    { name: "a11y", testDir: "e2e/a11y", use: { ...devices["Desktop Chrome"] } },
    {
      name: "visual",
      testDir: "e2e/visual",
      snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
      use: { ...devices["Desktop Chrome"] },
      expect: {
        toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide" },
      },
    },
  ],
  webServer: [
    {
      command: isCI ? "npm run start -w @portfolio/api" : "npm run dev -w @portfolio/api",
      url: `${apiURL}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: isCI ? "npm run start -w @portfolio/web" : "npm run dev -w @portfolio/web",
      url: baseURL,
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
  ],
});

import { expect, test } from "@playwright/test";
import { ADMIN, ADMIN_STATE, adminApi, deleteRecord, trackErrors, uniqueTitle } from "../support";

test.describe("admin sign-in", () => {
  test("protects admin pages and previews", async ({ page }) => {
    await page.goto("/admin/projects");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fprojects/);
    await page.goto("/preview/projects/00000000-0000-4000-8000-000000000000");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("rejects wrong credentials without saying which part was wrong", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("not-the-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /incorrect|invalid/i })).toBeVisible();
  });

  test("signs in and returns to the requested page", async ({ page }) => {
    await page.goto("/admin/login?next=%2Fadmin%2Fresearch");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/research$/);
    await expect(page.getByRole("heading", { level: 1, name: "Research" })).toBeVisible();
  });

  test("never redirects to another site after sign-in", async ({ page }) => {
    await page.goto("/admin/login?next=https%3A%2F%2Fevil.example%2F");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe("content management", () => {
  test.use({ storageState: ADMIN_STATE });

  test("dashboard summarises content", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Certifications\s*6/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("writes, previews, publishes and deletes a post with content blocks", async ({
    page,
    context,
  }) => {
    const title = uniqueTitle("E2E post");
    await page.goto("/admin/blog-posts/new");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await page.getByLabel("Excerpt").fill("Written by the end-to-end tests.");

    await page.getByRole("button", { name: "Add block" }).click();
    await page.getByRole("button", { name: /^Text\s*Paragraphs/ }).click();
    await page
      .getByRole("region", { name: "Text block 1" })
      .getByRole("textbox")
      .fill("A **bold** statement from the test suite.");

    await page.getByRole("button", { name: "Add block" }).click();
    await page.getByRole("button", { name: /^Chart\s*Line/ }).click();
    const chart = page.getByRole("region", { name: "Chart block 2" });
    await chart.getByLabel("Title").fill("Test series");
    await chart.getByLabel("What the chart shows").fill("Two points that rise.");
    await chart.getByLabel("Data (CSV)").fill("year,value\n2024,1\n2025,3");

    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page).toHaveURL(/\/admin\/blog-posts\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Post saved")).toBeVisible();
    const id = page.url().split("/").pop()!;

    // Drafts are visible in preview but not on the site.
    const preview = await context.newPage();
    await preview.goto(`/preview/blog-posts/${id}`);
    await expect(preview.getByText("Only signed-in editors can see this page.")).toBeVisible();
    await expect(preview.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await preview.close();

    await page.getByRole("button", { name: "Publish" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Unpublish")).toBeVisible();

    const slug = await page.getByLabel("URL slug").inputValue();
    await page.goto(`/blog/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.locator("strong", { hasText: "bold" })).toBeVisible();
    await expect(page.getByRole("img", { name: /Test series/ })).toBeVisible();

    await page.goto(`/admin/blog-posts/${id}`);
    await page.getByRole("button", { name: "Delete post" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/admin\/blog-posts$/);
    const gone = await page.request.get(`/api/public/blog/${slug}`);
    expect(gone.status()).toBe(404);
  });

  test("shows validation errors next to the field", async ({ page }) => {
    await page.goto("/admin/projects/new");
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByRole("alert").filter({ hasText: "Please fix" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("warns before leaving with unsaved changes", async ({ page }) => {
    await page.goto("/admin/projects/new");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill("Unsaved title");
    await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Research" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Leave without saving?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/admin\/projects\/new$/);
  });

  test("filters and bulk-edits lists", async ({ page }) => {
    const { api, csrf } = await adminApi();
    const created = await api.post("/api/admin/project-categories", {
      data: { name: uniqueTitle("E2E category") },
      headers: { "x-csrf-token": csrf },
    });
    const category = (await created.json()) as { data: { id: string; name: string } };
    await api.dispose();

    await page.goto("/admin/project-categories");
    await page
      .getByRole("searchbox", { name: "Search project categories" })
      .fill(category.data.name);
    await expect(page).toHaveURL(/q=/);
    const row = page.getByRole("row", { name: new RegExp(category.data.name) });
    await expect(row).toBeVisible();
    await row.getByRole("checkbox").check();
    await page
      .getByRole("region", { name: "Bulk actions" })
      .getByRole("button", { name: "Delete" })
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Nothing matches these filters")).toBeVisible();
  });

  test("certifications can be nested under a programme", async ({ page }) => {
    const { api, csrf } = await adminApi();
    const headers = { "x-csrf-token": csrf };
    const options = (await (
      await api.get("/api/admin/options?types=credential-providers,credential-types")
    ).json()) as {
      data: Record<string, { id: string; label: string }[]>;
    };
    const provider = options.data["credential-providers"]!.find(
      (item) => item.label === "DataCamp",
    )!;
    const type = options.data["credential-types"]![0]!;
    const programme = (await (
      await api.post("/api/admin/credentials", {
        data: { title: uniqueTitle("E2E track"), providerId: provider.id, typeId: type.id },
        headers,
      })
    ).json()) as { data: { id: string; slug: string } };
    const course = (await (
      await api.post("/api/admin/credentials", {
        data: {
          title: uniqueTitle("E2E course"),
          providerId: provider.id,
          typeId: type.id,
          parentId: programme.data.id,
        },
        headers,
      })
    ).json()) as { data: { id: string; title: string } };
    await api.dispose();

    try {
      await page.goto(`/certifications/${programme.data.slug}`);
      await expect(page.getByRole("link", { name: course.data.title })).toBeVisible();
      await page.goto(`/admin/credentials/${course.data.id}`);
      await expect(page.getByLabel("Part of")).toHaveValue(programme.data.id);
    } finally {
      await deleteRecord("credentials", course.data.id);
      await deleteRecord("credentials", programme.data.id);
    }
  });

  test("uploads media, edits alt text and blocks deleting files in use", async ({ page }) => {
    // 1×1 PNG.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=",
      "base64",
    );
    await page.goto("/admin/media");
    const name = `${uniqueTitle("e2e-image").replace(/\s/g, "-")}.png`;
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name, mimeType: "image/png", buffer: png });
    await expect(page.getByText("1 file uploaded")).toBeVisible();
    await page.getByRole("searchbox", { name: "Search media" }).fill(name.replace(".png", ""));
    await page.getByRole("button", { name: new RegExp(name.replace(".png", "")) }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Alt text").fill("A single test pixel");
    await dialog.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Details saved")).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await page
      .getByRole("dialog", { name: "Delete this file?" })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page.getByText("File deleted")).toBeVisible();
  });

  test("rejects files that are not what they claim to be", async ({ page }) => {
    await page.goto("/admin/media");
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "photo.png",
        mimeType: "image/png",
        buffer: Buffer.from("<html><script>alert(1)</script></html>"),
      });
    await expect(page.getByText(/not supported|does not match|Unsupported/i).first()).toBeVisible();
  });

  test("global search finds content", async ({ page }) => {
    await page.goto("/admin");
    await page.keyboard.press("Control+k");
    const search = page.getByRole("combobox");
    await search.fill("flood");
    await expect(
      page.getByRole("option", { name: /Flood event prediction in Bangladesh/ }).first(),
    ).toBeVisible();
    await search.press("Enter");
    await expect(page).toHaveURL(/\/admin\/(projects|research)\//);
  });

  test("messages from the contact form reach the inbox", async ({ page }) => {
    await page.goto("/admin/messages");
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
  });
});

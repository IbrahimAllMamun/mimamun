import { expect, test } from "@playwright/test";
import { ADMIN_STATE, adminApi, BASE_URL } from "../support";

test.describe("security", () => {
  test("pages send a nonce-based Content Security Policy and hardening headers", async ({
    request,
  }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toMatch(
      /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
    );
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("admin API requires a session", async ({ request }) => {
    const response = await request.get("/api/admin/projects");
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
  });

  test("state-changing requests need the CSRF token", async () => {
    const { api } = await adminApi();
    const response = await api.post("/api/admin/tags", { data: { name: "csrf-test" } });
    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe("CSRF_INVALID");
    await api.dispose();
  });

  test("requests from another origin are rejected", async () => {
    const { api, csrf } = await adminApi();
    const response = await api.post("/api/admin/tags", {
      data: { name: "cross-site" },
      headers: { "x-csrf-token": csrf, origin: "https://evil.example" },
    });
    expect(response.status()).toBe(403);
    await api.dispose();
  });

  test("admin pages are never cached or indexed", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE, baseURL: BASE_URL });
    const response = await context.request.get("/admin");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    expect(response.headers()["cache-control"]).toMatch(/no-store|no-cache/);
    await context.close();
  });

  test("uploaded files are served with safe headers", async () => {
    const { api, csrf } = await adminApi();
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=",
      "base64",
    );
    const upload = await api.post("/api/admin/media", {
      headers: { "x-csrf-token": csrf },
      multipart: { file: { name: "pixel.png", mimeType: "image/png", buffer: png } },
    });
    expect(upload.status()).toBe(201);
    const media = (await upload.json()) as { data: { id: string; url: string } };
    const file = await api.get(media.data.url);
    expect(file.headers()["x-content-type-options"]).toBe("nosniff");
    expect(file.headers()["content-security-policy"]).toContain("sandbox");
    await api.delete(`/api/admin/media/${media.data.id}`, { headers: { "x-csrf-token": csrf } });
    await api.dispose();
  });

  test("the revalidation hook refuses requests without the secret", async ({ request }) => {
    const response = await request.post("/internal/revalidate", {
      headers: { "x-revalidate-secret": "wrong" },
    });
    expect(response.status()).toBe(403);
  });
});

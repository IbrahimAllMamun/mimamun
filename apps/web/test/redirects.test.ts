import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/redirects";

describe("safeNext", () => {
  it("keeps admin and preview paths", () => {
    expect(safeNext("/admin/projects?status=draft")).toBe("/admin/projects?status=draft");
    expect(safeNext("/preview/projects/0b0e3c1e-5f5d-4a4b-9a57-2c1f3d9e8a10")).toBe(
      "/preview/projects/0b0e3c1e-5f5d-4a4b-9a57-2c1f3d9e8a10",
    );
    expect(safeNext(["/admin/media", "/admin"])).toBe("/admin/media");
  });

  it("refuses other sites and tricks that browsers treat as other sites", () => {
    for (const value of [
      "https://evil.example/",
      "//evil.example/admin",
      "/\\evil.example",
      "/admin\\@evil.example",
      "javascript:alert(1)",
    ]) {
      expect(safeNext(value)).toBe("/admin");
    }
  });

  it("refuses public pages and the sign-in pages themselves", () => {
    expect(safeNext("/projects")).toBe("/admin");
    expect(safeNext("/administrator")).toBe("/admin");
    expect(safeNext("/admin/login?next=/admin")).toBe("/admin");
    expect(safeNext(undefined)).toBe("/admin");
  });
});

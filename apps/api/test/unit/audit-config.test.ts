import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/env";
import { diffSnapshots } from "../../src/modules/audit/service";

describe("audit diff", () => {
  it("keeps only changed fields", () => {
    const { before, after } = diffSnapshots(
      { title: "A", summary: "same", updatedAt: "1" },
      { title: "B", summary: "same", updatedAt: "2" },
    );
    expect(before).toEqual({ title: "A" });
    expect(after).toEqual({ title: "B" });
  });
});

describe("configuration", () => {
  const base = {
    DATABASE_URL: "postgres://x",
    NODE_ENV: "production",
    APP_URL: "https://example.com",
  };

  it("refuses to start in production without a strong secret", () => {
    expect(() => loadConfig(base)).toThrow(/APP_SECRET/);
    expect(() => loadConfig({ ...base, APP_SECRET: "short" })).toThrow(/APP_SECRET/);
  });

  it("requires https in production", () => {
    expect(() =>
      loadConfig({ ...base, APP_URL: "http://example.com", APP_SECRET: "x".repeat(40) }),
    ).toThrow(/https/);
  });

  it("uses secure __Host- cookies in production", () => {
    const config = loadConfig({ ...base, APP_SECRET: "x".repeat(40) });
    expect(config.session.cookieSecure).toBe(true);
    expect(config.session.cookieName).toBe("__Host-portfolio_session");
  });

  it("requires MAIL_FROM when SMTP is configured", () => {
    expect(() =>
      loadConfig({ DATABASE_URL: "postgres://x", SMTP_HOST: "smtp.example.com" }),
    ).toThrow(/MAIL_FROM/);
  });
});

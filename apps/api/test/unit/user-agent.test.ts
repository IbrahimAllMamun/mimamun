import { describe, expect, it } from "vitest";
import { classifyUserAgent, describeUserAgent } from "../../src/lib/user-agent";
import { entityFromPath, referrerHost } from "../../src/modules/analytics/service";

describe("user agent classification", () => {
  it("classifies common browsers and devices", () => {
    const iphone = classifyUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    );
    expect(iphone).toEqual({ isBot: false, device: "mobile", browser: "Safari", os: "iOS" });
    const edge = classifyUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 Edg/141.0",
    );
    expect(edge.browser).toBe("Edge");
    expect(edge.os).toBe("Windows");
    expect(
      classifyUserAgent(
        "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/141 Safari/537.36",
      ).device,
    ).toBe("tablet");
  });

  it("detects bots and empty agents", () => {
    expect(classifyUserAgent("Googlebot/2.1 (+http://www.google.com/bot.html)").isBot).toBe(true);
    expect(classifyUserAgent("curl/8.5.0").isBot).toBe(true);
    expect(classifyUserAgent("").isBot).toBe(true);
    expect(describeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/131.0")).toBe(
      "Firefox on macOS",
    );
  });
});

describe("analytics helpers", () => {
  it("derives entities only from known content paths", () => {
    expect(entityFromPath("/projects/flood-event-prediction")).toEqual({
      entityType: "project",
      entitySlug: "flood-event-prediction",
    });
    expect(entityFromPath("/blog/a-post/")).toEqual({
      entityType: "blog_post",
      entitySlug: "a-post",
    });
    expect(entityFromPath("/projects")).toBeNull();
    expect(entityFromPath("/admin/projects/x")).toBeNull();
  });

  it("keeps only external referrer hosts", () => {
    expect(referrerHost("https://www.linkedin.com/feed/?x=1", "example.com")).toBe("linkedin.com");
    expect(referrerHost("https://example.com/about", "example.com")).toBeNull();
    expect(referrerHost("not a url", "example.com")).toBeNull();
  });
});

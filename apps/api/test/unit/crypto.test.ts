import { describe, expect, it } from "vitest";
import { hmacHex, randomToken, safeEqual, sha256Hex, signTimestamp, verifyTimestamp } from "../../src/lib/crypto";

describe("crypto helpers", () => {
  it("creates unpredictable url-safe tokens", () => {
    const a = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(a);
  });

  it("hashes deterministically", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hmacHex("k", "v")).toHaveLength(64);
  });

  it("compares in constant time and handles different lengths", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("verifies signed timestamps", () => {
    const now = 1_700_000_000_000;
    const token = signTimestamp("secret", "contact", now);
    const options = { minAgeMs: 3000, maxAgeMs: 60_000 };
    expect(verifyTimestamp("secret", "contact", token, { ...options, now: now + 5000 })).toBe("valid");
    expect(verifyTimestamp("secret", "contact", token, { ...options, now: now + 1000 })).toBe("too_fast");
    expect(verifyTimestamp("secret", "contact", token, { ...options, now: now + 120_000 })).toBe("expired");
    expect(verifyTimestamp("other", "contact", token, { ...options, now: now + 5000 })).toBe("invalid");
    expect(verifyTimestamp("secret", "other", token, { ...options, now: now + 5000 })).toBe("invalid");
    expect(verifyTimestamp("secret", "contact", "garbage", options)).toBe("invalid");
  });
});

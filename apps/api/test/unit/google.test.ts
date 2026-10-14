import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyIdToken, type PublicJwk } from "../../src/integrations/google";
import {
  GOOGLE_FLOW_MAX_AGE_MS,
  codeChallenge,
  newGoogleFlow,
  openGoogleFlow,
  sealGoogleFlow,
} from "../../src/modules/auth/google";

const CLIENT_ID = "client-123.apps.googleusercontent.com";
const NONCE = "nonce-abc";
const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...(publicKey.export({ format: "jwk" }) as PublicJwk), kid: "key-1", alg: "RS256" };
const other = generateKeyPairSync("rsa", { modulusLength: 2048 });

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

function idToken(
  claims: Record<string, unknown> = {},
  options: { kid?: string; alg?: string; key?: typeof privateKey } = {},
): string {
  const header = encode({ alg: options.alg ?? "RS256", kid: options.kid ?? "key-1", typ: "JWT" });
  const payload = encode({
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "1098765",
    email: "owner@example.com",
    email_verified: true,
    nonce: NONCE,
    iat: NOW / 1000 - 10,
    exp: NOW / 1000 + 3600,
    ...claims,
  });
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(`${header}.${payload}`),
    options.key ?? privateKey,
  ).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const verifyAt = (token: string, nonce = NONCE) =>
  verifyIdToken(token, [jwk], { clientId: CLIENT_ID, nonce, now: NOW });

describe("Google ID token verification", () => {
  it("returns the identity for a valid token", () => {
    expect(verifyAt(idToken())).toEqual({
      subject: "1098765",
      email: "owner@example.com",
      emailVerified: true,
    });
  });

  it("reports an unverified email", () => {
    expect(verifyAt(idToken({ email_verified: false })).emailVerified).toBe(false);
  });

  it("rejects a token signed by another key", () => {
    expect(() => verifyAt(idToken({}, { key: other.privateKey }))).toThrow(/signature/);
  });

  it("rejects an unknown key id and other algorithms", () => {
    expect(() => verifyAt(idToken({}, { kid: "key-2" }))).toThrow(/signing key/);
    expect(() => verifyAt(idToken({}, { alg: "none" }))).toThrow(/algorithm/);
  });

  it("rejects a tampered payload", () => {
    const [header, , signature] = idToken().split(".");
    const forged = encode({ iss: "https://accounts.google.com", aud: CLIENT_ID, sub: "x" });
    expect(() => verifyAt(`${header}.${forged}.${signature}`)).toThrow(/signature/);
  });

  it("checks issuer, audience, expiry and nonce", () => {
    expect(() => verifyAt(idToken({ iss: "https://evil.example" }))).toThrow(/issuer/);
    expect(() => verifyAt(idToken({ aud: "another-client" }))).toThrow(/another client/);
    expect(() => verifyAt(idToken({ exp: NOW / 1000 - 120 }))).toThrow(/expired/);
    expect(() => verifyAt(idToken({ iat: NOW / 1000 + 600 }))).toThrow(/future/);
    expect(() => verifyAt(idToken(), "other-nonce")).toThrow(/nonce/);
  });

  it("rejects malformed tokens", () => {
    expect(() => verifyAt("not-a-token")).toThrow(/Malformed/);
    expect(() => verifyAt("a.b.c")).toThrow(/Malformed/);
  });
});

describe("Google sign-in flow cookie", () => {
  const secret = "test-secret-test-secret-test-secret-000";

  it("round-trips and keeps only safe return paths", () => {
    const flow = newGoogleFlow("/admin/projects?status=draft");
    expect(openGoogleFlow(secret, sealGoogleFlow(secret, flow))).toEqual(flow);
    expect(newGoogleFlow("https://evil.example").next).toBe("/admin");
    expect(newGoogleFlow(["/admin/media"]).next).toBe("/admin");
  });

  it("rejects tampered, foreign and expired cookies", () => {
    const flow = newGoogleFlow("/admin");
    const sealed = sealGoogleFlow(secret, flow);
    const [, signature] = sealed.split(".");
    const tampered = `${encode({ ...flow, next: "//evil.example" })}.${signature}`;
    expect(openGoogleFlow(secret, tampered)).toBeNull();
    expect(openGoogleFlow("another-secret-another-secret-0000", sealed)).toBeNull();
    expect(openGoogleFlow(secret, sealed, flow.issuedAt + GOOGLE_FLOW_MAX_AGE_MS + 1)).toBeNull();
    expect(openGoogleFlow(secret, undefined)).toBeNull();
  });

  it("derives the PKCE S256 challenge", () => {
    // base64url of SHA-256("abc") = ba7816bf…15ad
    expect(codeChallenge("abc")).toBe("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
    expect(newGoogleFlow(null).codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  });
});

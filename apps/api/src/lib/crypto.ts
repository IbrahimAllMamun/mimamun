import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacHex(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Signed, timestamped token: `<issuedAtMs>.<hmac>`. Used by the contact form to
 * reject submissions that arrive implausibly fast or with a forged/old token.
 */
export function signTimestamp(secret: string, purpose: string, now = Date.now()): string {
  return `${now}.${hmacHex(secret, `${purpose}:${now}`)}`;
}

export function verifyTimestamp(
  secret: string,
  purpose: string,
  token: string,
  options: { minAgeMs: number; maxAgeMs: number; now?: number },
): "valid" | "invalid" | "too_fast" | "expired" {
  const [issuedRaw, signature] = token.split(".");
  if (!issuedRaw || !signature || !/^\d{10,16}$/.test(issuedRaw)) return "invalid";
  const issuedAt = Number(issuedRaw);
  if (!safeEqual(signature, hmacHex(secret, `${purpose}:${issuedAt}`))) return "invalid";
  const age = (options.now ?? Date.now()) - issuedAt;
  if (age < options.minAgeMs) return "too_fast";
  if (age > options.maxAgeMs) return "expired";
  return "valid";
}

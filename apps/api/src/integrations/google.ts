import { createPublicKey, verify } from "node:crypto";
import { safeEqual } from "../lib/crypto";

/**
 * Google sign-in (OpenID Connect authorization-code flow with PKCE). Only the
 * identity claims are used: no Google API is called on the user's behalf and
 * no Google token is stored.
 */

const AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
/** Allowed clock difference when checking `exp` and `iat`. */
const CLOCK_SKEW_SECONDS = 60;

export interface GoogleIdentity {
  /** Stable Google account id (`sub`). */
  subject: string;
  email: string;
  emailVerified: boolean;
}

export interface GoogleOAuthClient {
  authorizationUrl(params: { state: string; nonce: string; codeChallenge: string }): string;
  /** Exchanges the authorization code and returns the verified ID-token identity. */
  signIn(params: { code: string; codeVerifier: string; nonce: string }): Promise<GoogleIdentity>;
}

export class GoogleSignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleSignInError";
  }
}

export interface PublicJwk {
  kid?: string;
  kty?: string;
  alg?: string;
  n?: string;
  e?: string;
}

function decodeJson(segment: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  throw new GoogleSignInError("Malformed ID token");
}

/** The `kid` an ID token was signed with (to pick or refresh signing keys). */
export function idTokenKeyId(token: string): string | null {
  const header = token.split(".")[0];
  if (!header) return null;
  try {
    const kid = decodeJson(header).kid;
    return typeof kid === "string" ? kid : null;
  } catch {
    return null;
  }
}

/**
 * Verifies a Google ID token: RS256 signature against Google's published
 * keys, issuer, audience, expiry and the nonce bound to this sign-in.
 */
export function verifyIdToken(
  token: string,
  keys: readonly PublicJwk[],
  expected: { clientId: string; nonce: string; now?: number },
): GoogleIdentity {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
    throw new GoogleSignInError("Malformed ID token");
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const header = decodeJson(encodedHeader);
  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new GoogleSignInError("Unexpected ID token algorithm");
  }
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) throw new GoogleSignInError("Unknown ID token signing key");
  const valid = verify(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    createPublicKey({ key: { kty: "RSA", n: jwk.n, e: jwk.e }, format: "jwk" }),
    Buffer.from(encodedSignature, "base64url"),
  );
  if (!valid) throw new GoogleSignInError("Invalid ID token signature");

  const claims = decodeJson(encodedPayload);
  const now = Math.floor((expected.now ?? Date.now()) / 1000);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (typeof claims.iss !== "string" || !ISSUERS.has(claims.iss)) {
    throw new GoogleSignInError("Unexpected ID token issuer");
  }
  if (!audience.includes(expected.clientId)) {
    throw new GoogleSignInError("ID token was issued for another client");
  }
  if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_SECONDS < now) {
    throw new GoogleSignInError("ID token has expired");
  }
  if (typeof claims.iat === "number" && claims.iat - CLOCK_SKEW_SECONDS > now) {
    throw new GoogleSignInError("ID token was issued in the future");
  }
  if (typeof claims.nonce !== "string" || !safeEqual(claims.nonce, expected.nonce)) {
    throw new GoogleSignInError("ID token nonce does not match");
  }
  if (typeof claims.sub !== "string" || !claims.sub || typeof claims.email !== "string") {
    throw new GoogleSignInError("ID token has no account id or email");
  }
  return {
    subject: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
  };
}

export class HttpGoogleOAuthClient implements GoogleOAuthClient {
  private keys: PublicJwk[] = [];
  private keysExpireAt = 0;

  constructor(
    private readonly config: { clientId: string; clientSecret: string; redirectUri: string },
    private readonly timeoutMs = 10_000,
  ) {}

  authorizationUrl(params: { state: string; nonce: string; codeChallenge: string }): string {
    const query = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: "openid email",
      state: params.state,
      nonce: params.nonce,
      code_challenge: params.codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    });
    return `${AUTHORIZATION_URL}?${query.toString()}`;
  }

  async signIn(params: {
    code: string;
    codeVerifier: string;
    nonce: string;
  }): Promise<GoogleIdentity> {
    const response = await this.request(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: params.code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: "authorization_code",
        code_verifier: params.codeVerifier,
      }),
    });
    const body = (await response.json().catch(() => null)) as { id_token?: unknown } | null;
    if (!response.ok || typeof body?.id_token !== "string") {
      throw new GoogleSignInError(`Google token exchange failed: HTTP ${response.status}`);
    }
    const token = body.id_token;
    const keys = await this.signingKeys(idTokenKeyId(token));
    return verifyIdToken(token, keys, { clientId: this.config.clientId, nonce: params.nonce });
  }

  /** Google's signing keys, cached for as long as Google allows; refreshed for an unknown `kid`. */
  private async signingKeys(kid: string | null): Promise<PublicJwk[]> {
    const known = this.keys.some((key) => key.kid === kid);
    if (known && Date.now() < this.keysExpireAt) return this.keys;
    const response = await this.request(CERTS_URL, { method: "GET" });
    const body = (await response.json().catch(() => null)) as { keys?: unknown } | null;
    if (!response.ok || !Array.isArray(body?.keys)) {
      throw new GoogleSignInError(`Google signing keys unavailable: HTTP ${response.status}`);
    }
    const maxAge = /max-age=(\d+)/.exec(response.headers.get("cache-control") ?? "")?.[1];
    this.keys = body.keys as PublicJwk[];
    this.keysExpireAt = Date.now() + Math.min(Number(maxAge ?? 3600), 86_400) * 1000;
    return this.keys;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (error) {
      throw new GoogleSignInError(`Google request failed: ${(error as Error).message}`);
    }
  }
}

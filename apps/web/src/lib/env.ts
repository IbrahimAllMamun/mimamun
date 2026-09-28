/** Server-side configuration for the web app. */
export const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);

/**
 * Canonical public origin, e.g. https://example.com (no trailing slash). Read
 * at runtime from APP_URL — the same variable the API uses — rather than a
 * NEXT_PUBLIC_ variable, which Next.js would freeze into the build.
 */
export const SITE_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Seconds before cached public data is refreshed if no revalidation webhook arrives. */
export const CONTENT_REVALIDATE_SECONDS = 600;

/** Shared with the API; authenticates `POST /internal/revalidate`. Server-only. */
export const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET ?? "";

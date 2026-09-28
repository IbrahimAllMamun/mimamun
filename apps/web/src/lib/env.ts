/** Server-side configuration for the web app. */
export const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** Canonical public origin, e.g. https://example.com (no trailing slash). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Seconds before cached public data is refreshed if no revalidation webhook arrives. */
export const CONTENT_REVALIDATE_SECONDS = 600;

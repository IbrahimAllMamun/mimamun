# Security

What protects the site and the CMS, where it is implemented, and what an
operator must keep in place. Authentication and authorization have their own
documents (`authentication.md`, `authorization.md`).

## Trust boundaries

```
Internet ──HTTPS──▶ Caddy ──▶ web (Next.js) ──server-side fetch──▶ api (Express) ──▶ PostgreSQL
                         └──────────────▶ api  (/api/*, /media/*, /cv)
```

- Only Caddy publishes ports (80/443) in `docker-compose.prod.yml`. The API,
  web and database containers are reachable only on the Compose network.
- The API is the only component with database access and the only place
  where authorization is decided.
- `/internal/revalidate` exists on the web container for the API; Caddy
  answers 404 for `/internal/*` from the outside, and the route also requires
  the shared `REVALIDATE_SECRET` (compared as SHA-256 digests with
  `timingSafeEqual`).

## HTTP headers

**Caddy** (`docker/Caddyfile`): TLS with automatic certificates,
`Strict-Transport-Security: max-age=31536000; includeSubDomains`,
`X-Content-Type-Options: nosniff`, and removes `Server`/`X-Powered-By`.

**Web pages** (`apps/web/src/proxy.ts`, `apps/web/next.config.ts`):

- A Content-Security-Policy generated per request with a fresh nonce:
  `script-src 'self' 'nonce-…' 'strict-dynamic'`, `style-src 'self'
'nonce-…'`, `style-src-attr 'unsafe-inline'` (React style attributes used
  for chart geometry and image placeholders), `img-src 'self' data: blob:`,
  `connect-src 'self'`, `frame-src` limited to the allow-listed embed and
  video hosts, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `frame-ancestors 'none'` and `upgrade-insecure-requests`. Development adds
  `'unsafe-eval'` and inline styles for the Next.js dev tooling only.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
  `Cross-Origin-Opener-Policy: same-origin`, and a `Permissions-Policy` that
  disables camera, microphone, geolocation, payment, USB and topics.
- `/admin/*` and `/preview/*` also get `Cache-Control: no-store` and
  `X-Robots-Tag: noindex, nofollow`.

**API** (`apps/api/src/middleware/security-headers.ts`, helmet): a CSP of
`default-src 'none'; frame-ancestors 'none'`, `X-Frame-Options: DENY`,
`Cross-Origin-Resource-Policy: same-site`, `Cross-Origin-Opener-Policy`,
`Referrer-Policy`, no `X-Powered-By`, and `Cache-Control: no-store` on every
`/api/auth` and `/api/admin` response.

## Input and output

- **Validation**: every body and query is parsed with a zod schema from
  `@portfolio/shared`; unknown keys are dropped and failures return
  `400 VALIDATION_ERROR` with field messages. JSON bodies are limited to
  2 MB; the query parser does not build nested objects; malformed UUIDs in
  paths are treated as "not found".
- **SQL**: all queries go through Drizzle's parameterised builder or tagged
  `sql` templates. Search terms are plain parameters (a test sends SQL
  metacharacters to prove it).
- **Markdown**: rendered with unified (remark → rehype → `rehype-sanitize`
  with a strict schema → React elements), never through
  `dangerouslySetInnerHTML`. Only `http(s)` and `mailto` links survive; raw
  HTML is kept as inert text.
- **URLs** entered in the CMS are validated as `http(s)`; `javascript:` and
  other schemes are rejected.
- **Embeds**: the `embed` block accepts only hosts in `EMBED_HOSTS`
  (`packages/shared/src/content/embeds.ts`) and videos only from
  youtube-nocookie.com and player.vimeo.com; the CSP `frame-src` is built from
  the same lists.
- **JSON-LD** is serialised with `<`, `>` and `&` escaped so content cannot
  close the `<script>` element.
- **Errors**: the API returns the error envelope with a request id and never
  a stack trace; unexpected errors are logged server-side.

## Uploads

Implemented in `apps/api/src/modules/media` and exercised by
`apps/api/test/integration/media.test.ts`.

| Control        | Detail                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who            | `media:manage` only                                                                                                                                                       |
| Size           | images 10 MB, documents 20 MB, video 100 MB by default (`UPLOAD_MAX_*_MB`); one file per request                                                                          |
| Type detection | magic bytes, never the file name or the browser's MIME type. Allowed: JPEG, PNG, WebP, AVIF, PDF, MP4, WebM. SVG, HTML and everything else are refused (`415`)            |
| Images         | decoded and re-encoded with sharp: EXIF orientation applied, all metadata (GPS, camera, author) dropped, longest edge capped at 3200 px, decoding capped at 60 megapixels |
| PDFs           | files containing JavaScript, launch actions, embedded files, RichMedia or XFA are refused                                                                                 |
| Storage        | random keys (`YYYY/MM/<uuid>.<ext>`) under `UPLOAD_DIR`; original names are kept only as metadata, sanitised for downloads                                                |
| Delivery       | `/media/*` looks the key up in the database, sets the stored MIME type, `nosniff`, `Content-Disposition`, and a sandboxing CSP for images and video                       |
| Deletion       | refused while the file is referenced by any content (the API lists where it is used)                                                                                      |

## Contact form

- Rate limited to 5 messages per hour and 20 per day per IP.
- A hidden honeypot field: filled in means a bot, answered with success and
  stored nowhere.
- A signed timestamp token (HMAC with `APP_SECRET`) must be at least 3
  seconds and at most 24 hours old; a missing or forged token, or more than
  five links, stores the message with status `spam` and sends no email.
- The sender's IP is kept only as an HMAC (`ip_hash`), never in clear.
- Message bodies are never written to logs.

## Privacy

Analytics use no cookies and store no IP addresses; see `analytics.md`.

## Secrets and configuration

- Secrets come only from environment variables; `.env` files are
  git-ignored and excluded from Docker build contexts.
- In production the API refuses to start unless `APP_SECRET` has at least 32
  characters and `APP_URL` uses `https`.
- The logger redacts cookies, authorization and CSRF headers, `Set-Cookie`,
  and fields named `password`, `currentPassword`, `newPassword`,
  `passwordHash`, `token`, `csrfToken` and `secret`; access logs record the
  path without the query string and never the body.
- Audit-log snapshots skip password, token and hash fields and are capped in
  size.

## Rate limits

| Endpoint                                    | Limit                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `POST /api/auth/login`                      | failed attempts: 30 per 15 min per IP; `LOGIN_MAX_ATTEMPTS` per `LOGIN_LOCKOUT_MINUTES` per email |
| `POST /api/auth/password/*` (forgot, reset) | 5 per hour                                                                                        |
| `POST /api/public/contact`                  | 5 per hour and 20 per day per IP                                                                  |
| `POST /api/analytics/events`                | 60 per minute per IP                                                                              |

Limits answer `429 RATE_LIMITED` with `Retry-After` and the standard
`RateLimit` headers.

**Operator notes**

- Counters live in memory in the API process. That is correct for the single
  API instance in the provided Compose files. Running several API instances
  would need a shared store for `express-rate-limit` and `JOBS_ENABLED=false`
  on all but one instance.
- Limits are keyed by client IP, which Express reads from `X-Forwarded-For`
  only when the request comes from a trusted proxy (`TRUST_PROXY`, default:
  loopback and private networks such as the Compose network). Caddy sets the
  header. If you put a CDN or load balancer in front of Caddy, add its ranges
  to Caddy's `trusted_proxies` (commented in the Caddyfile) so the real client
  address is passed on. Never publish the API port directly.

## Dependencies

- `npm audit --omit=dev` reports no known vulnerabilities in production
  dependencies at the time of writing.
- `npm audit` flags a moderate advisory in development tooling only:
  `drizzle-kit` (used for `db:generate`) bundles an old `esbuild` whose
  development _server_ could be read cross-origin. That server is never
  started in this project, and the package is not in the production images.
- New dependencies need a reason in the pull request (size, maintenance,
  security, and whether the platform already covers the need).

## Security tests

- `e2e/tests/security.spec.ts`: CSP and hardening headers, admin API needs a
  session, CSRF token and origin checks, admin pages are uncached and
  unindexed, safe headers on uploaded files, and the revalidation hook
  refusing requests without the secret.
- `apps/api/test/integration/*`: generic sign-in errors and lockout,
  authorization for every admin area, disguised and scriptable uploads,
  oversized bodies, SQL metacharacters, inert HTML and rejected script URLs,
  no draft leaks through search or the sitemap, error responses without
  stack traces, spam handling and rate limits on the contact form.

## Checklist for changes

- New admin route → `requirePermission(...)`, audit entry, revalidation.
- New input → zod schema in `@portfolio/shared`, validated at the route.
- New rendering of stored text → through the Markdown component or plain
  text; never raw HTML.
- New third-party embed or script → extend the allow-list and CSP
  deliberately, in one place.
- Never weaken CSP, cookie flags, rate limits or upload validation to make
  something work.

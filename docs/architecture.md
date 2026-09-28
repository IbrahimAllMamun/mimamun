# Architecture

This document describes how the portfolio is put together: the runtime pieces,
how requests flow, where code lives and why. It is the entry point for anyone
changing the system. Companion documents go deeper on specific areas
(`database.md`, `api.md`, `design-system.md`, `security.md`, `deployment.md`).

## 1. Goals that shaped the architecture

| Goal                                                | Consequence                                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content changes never need a deploy                 | Every piece of portfolio content lives in PostgreSQL and is edited through the admin CMS. The frontend contains layout and presentation, not content.                           |
| The public site keeps working when something breaks | Public pages read through a cached data layer; integrations (GitHub, email) are isolated behind modules that fail closed and never block rendering.                             |
| Authorization is enforced by the server             | The Express API checks the session and the permission on every protected route. The Next.js admin only hides UI; it is never the security boundary.                             |
| Minimal client-side JavaScript                      | Public pages are React Server Components. Client components exist only where interaction requires them (navigation drawer, filters, contact form, theme toggle, admin editors). |
| Evidence over claims                                | The content model separates evidence (projects, research, experience, credentials) from narrative (bio, focus areas) so the UI can present evidence first.                      |

## 2. Runtime components

```
                    ┌──────────────────────────── Browser ────────────────────────────┐
                    │  public pages (RSC HTML)   admin CMS (RSC + client islands)      │
                    └───────────────┬───────────────────────────────┬─────────────────┘
                                    │ HTTPS                         │ /api/*, /media/*, /cv
                         ┌──────────▼──────────┐                    │
                         │  Caddy (production) │────────────────────┤
                         └──────────┬──────────┘                    │
                  everything else   │                               │
                         ┌──────────▼──────────┐   server-side  ┌───▼──────────────────┐
                         │  Next.js  (apps/web)│───fetch───────▶│ Express API (apps/api)│
                         │  :3000              │◀──revalidate───│ :4000                 │
                         └─────────────────────┘                └───┬─────────┬────────┘
                                                                    │         │
                                                       ┌────────────▼──┐  ┌───▼────────────┐
                                                       │ PostgreSQL 16 │  │ uploads volume │
                                                       └───────────────┘  └────────────────┘
                                                        optional: SMTP, GitHub REST API
```

- **Next.js (`apps/web`)** renders the public website and the admin UI. Server
  components fetch from the API over the internal network
  (`API_INTERNAL_URL`). The browser talks to the API through the same origin:
  `/api/*`, `/media/*` and `/cv` are routed to Express by Caddy in production
  and by Next.js rewrites in development. Same-origin keeps cookies first-party
  and removes the need for CORS.
- **Express (`apps/api`)** owns all business logic: validation, authentication,
  authorization, persistence, media handling, analytics ingestion,
  integrations and audit logging.
- **PostgreSQL** is the single source of truth. Media binaries live on a
  volume (a storage driver interface allows an object store later); their
  metadata lives in the `media` table.
- **Caddy** terminates TLS (automatic certificates), sets transport security
  headers and routes paths to the two services.

## 3. Request flows

### Public page

1. Browser requests `/projects/flood-event-prediction`.
2. `proxy.ts` (Next.js middleware) generates a per-request CSP nonce.
3. The page (server component) calls `GET /api/public/projects/:slug` through
   `lib/api/server.ts`. The call is cached in the Next.js data cache with the
   `content` tag and a time-based fallback revalidation.
4. HTML streams to the browser. The only JavaScript shipped is Next's runtime
   plus the small client islands on that page.

### Content edit

1. Editor saves a project in `/admin/projects/:id`.
2. The client component sends `PUT /api/admin/projects/:id` with the session
   cookie and `X-CSRF-Token`.
3. Express: session → permission (`content:write`) → CSRF → zod validation →
   transaction (row + relations) → audit log → response.
4. After commit the API calls `POST {WEB_INTERNAL_URL}/internal/revalidate`
   with a shared secret; Next.js expires the `content` cache tag. If that call
   fails the time-based revalidation still refreshes content within minutes.

### Failure modes

| Failure                        | Behaviour                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| API unreachable from Next.js   | Cached data is served while stale; sections without cached data render an intentional "temporarily unavailable" state. |
| Database down                  | `/api/health/db` reports 503; API responds `SERVICE_UNAVAILABLE`; public pages degrade as above.                       |
| GitHub API down / rate limited | Public site reads the last synced repositories from PostgreSQL; the admin shows the integration error.                 |
| SMTP down                      | Contact messages are still stored; the notification failure is logged and visible in the admin.                        |

## 4. Repository layout

```
apps/
  api/                  Express + TypeScript + Drizzle ORM
    src/
      app.ts            createApp(): middleware + routers (no side effects, testable)
      server.ts         process entry: config, DB pool, scheduler, graceful shutdown
      config/           environment parsing (zod) and constants
      database/         Drizzle schema, generated SQL migrations, migrator, seed
      middleware/       request id, logging, sessions, auth, CSRF, rate limits, errors
      modules/<domain>/ routes + service + mapper per domain (auth, projects, …)
      integrations/     github, mailer, web revalidation (all optional, fail-safe)
      lib/              shared server utilities (errors, responses, crypto, crud helpers)
      jobs/             in-process scheduler (GitHub sync, retention, cleanup)
    test/               unit + integration tests (Vitest + Supertest, real PostgreSQL)
  web/                  Next.js App Router + Tailwind CSS v4
    src/
      app/              routes: (site) public group, admin, preview, internal
      components/       ui primitives, site chrome, content blocks, charts, admin
      lib/              API clients, SEO helpers, formatting, analytics beacon
      styles/           design tokens and global CSS
      fonts/            self-hosted variable fonts (OFL)
packages/
  shared/               zod schemas, content-block registry, DTO types, permissions,
                        formatting and chart math shared by API and web
e2e/                    Playwright end-to-end, accessibility and visual regression tests
docker/                 Caddyfile and container helpers
scripts/                backup / restore helpers
docs/                   developer documentation (this folder)
```

## 5. Technology choices

| Concern          | Choice                                         | Why                                                                                           |
| ---------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Frontend         | Next.js 16 (App Router), React 19              | Server components, streaming, metadata API, image optimisation, standalone output for Docker. |
| Styling          | Tailwind CSS v4 with CSS-first `@theme` tokens | Tokens are CSS variables, default palette removed so only design-system values exist.         |
| Backend          | Express 5 + TypeScript                         | Mature, explicit middleware model; Express 5 forwards async errors natively.                  |
| ORM / migrations | Drizzle ORM + drizzle-kit                      | Type-safe SQL builder, schema as code, reviewable SQL migrations, no binary engine.           |
| Validation       | zod 4 in `packages/shared`                     | Same schemas validate API input and power admin forms.                                        |
| Passwords        | Argon2id (`@node-rs/argon2`)                   | OWASP-recommended KDF; prebuilt binaries, no native build step.                               |
| Logging          | pino + pino-http                               | Structured JSON logs with redaction of secrets.                                               |
| Images           | sharp (API) + `next/image` (web)               | Uploads are re-encoded (EXIF/GPS stripped); responsive sizes generated on demand.             |
| Markdown         | unified (remark → rehype-sanitize → JSX)       | AST-based, sanitised, rendered to React elements without `dangerouslySetInnerHTML`.           |
| Charts           | Hand-written SVG components                    | Zero client JS, accessible (title, description, data table fallback), themeable with tokens.  |
| Tests            | Vitest, Supertest, Playwright, axe-core        | Unit/integration against real PostgreSQL; E2E, accessibility and screenshot regression.       |

Dependencies are added deliberately; see `CLAUDE.md` for the checklist.

## 6. Caching and rendering strategy

- All public routes render dynamically because a strict nonce-based Content
  Security Policy is applied per request. Data, not HTML, is cached: every
  public API call uses the Next.js data cache (`revalidate` + `content` tag).
- The API sets `Cache-Control` on public endpoints for intermediaries and on
  `/media/*` (immutable, content-addressed keys).
- Preview and admin requests always bypass caches (`cache: "no-store"`).

## 7. Cross-cutting conventions

- **API envelope**: `{ success: true, data, meta? }` or
  `{ success: false, error: { code, message, details? } }` (see `api.md`).
- **Identifiers**: UUID primary keys internally; public URLs use stable slugs.
- **Dates**: career, education, research and credential dates are stored as the
  first day of the month and shown at month precision; timestamps are
  `timestamptz`.
- **Content status**: projects, research, publications, presentations and posts
  use `draft → published → archived`; simpler records use `is_visible`.
- **Audit**: every admin mutation writes an `audit_logs` row with before/after
  values (secrets stripped).

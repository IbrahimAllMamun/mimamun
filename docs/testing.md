# Testing

| Layer                    | Tool                   | Where                       | Needs                          |
| ------------------------ | ---------------------- | --------------------------- | ------------------------------ |
| Shared logic and schemas | Vitest                 | `packages/shared/test`      | nothing                        |
| Web helpers              | Vitest                 | `apps/web/test`             | nothing                        |
| API unit                 | Vitest                 | `apps/api/test/unit`        | PostgreSQL (global setup)      |
| API integration          | Vitest + Supertest     | `apps/api/test/integration` | PostgreSQL test database       |
| End-to-end               | Playwright             | `e2e/tests`                 | running API + web, seeded data |
| Accessibility            | Playwright + axe-core  | `e2e/a11y`                  | same                           |
| Visual regression        | Playwright screenshots | `e2e/visual`                | same                           |

## Unit and integration tests

```bash
npm test                          # every workspace
npm test -w @portfolio/shared     # one workspace
npm run test:watch -w @portfolio/api
```

- **Shared** — URL safety, month-date and list normalisation, the password
  policy, experience date rules, content blocks (chart data, the embed
  allow-list, video URLs, media references), project sections, the contact
  form; slugs, text helpers, periods and durations, chart ticks and CSV
  parsing, and APA/BibTeX citations.
- **Web** — the redirect guard (`safeNext`), SEO metadata precedence, the
  admin form's dot-path helpers and the credential-tree filter.
- **API unit** — configuration rules (including that `.env.example` is
  accepted as-is), audit diffs, crypto helpers, magic-byte detection and
  user-agent classification.
- **API integration** — the real Express app (`createApp`) against a real
  PostgreSQL database through Supertest: authentication, authorization,
  content CRUD and publishing, public endpoints (including that drafts never
  leak), media uploads, the contact form, analytics and the GitHub sync
  (with a fake GitHub client), plus security headers and error handling.

### Test database

The API tests use `TEST_DATABASE_URL`, default
`postgres://portfolio:portfolio@localhost:5432/portfolio_test`. The Compose
database creates `portfolio_test` automatically; for a local PostgreSQL see
`setup.md`. **The global setup drops and recreates the schema of that
database** and applies every migration once per run, so never point it at a
database you care about. Each test file builds its own app with fresh data
(`apps/api/test/helpers/context.ts` empties the tables and re-seeds); email,
GitHub and web revalidation are replaced with in-memory fakes.

## End-to-end, accessibility and visual tests

```bash
npm run test:e2e           # e2e + a11y projects
npm run test:visual        # screenshot comparison
npx playwright test        # all three
npx playwright test e2e/tests/admin.spec.ts -g "bulk"   # a subset
```

Playwright (`playwright.config.ts`) runs against a live site with a migrated
and seeded database:

- Locally it reuses servers already listening on ports 3000 and 4000 (start
  them with `npm run dev`), or starts the dev servers itself.
- In CI (`CI=true`) it starts the production builds with `npm run start`.

Tests run one at a time (`workers: 1`) because they share a database and an
admin account. They use Chromium with reduced motion, the `en-GB` locale and
the `Asia/Dhaka` time zone.

### Admin credentials

Playwright does **not** read `.env`. The admin account comes from
`E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`, falling back to `SEED_ADMIN_EMAIL`
/ `SEED_ADMIN_PASSWORD` from the shell, then to `admin@example.com` /
`local-admin-password-123`. The simplest local setup is to seed with those
defaults (see `setup.md`) or export the variables before running.

The global setup signs in once and stores the session in
`e2e/.auth/admin.json` (git-ignored); later runs reuse it while it is still
valid. Tests that need data create it through the admin UI or API and remove
it afterwards.

### What the suites cover

- `e2e/tests/public.spec.ts` — the home page shows City Bank as the current
  role and never shows IDLC as current; header navigation; project filters
  and case studies; copying a research citation; honest experience dates;
  certifications grouped by provider and filtered by type; site search; the
  404 page; theme persistence; the skip link; the CV fallback while no CV is
  uploaded; sitemap and robots; structured data and social metadata; and the
  contact form's inline validation and successful sending.
- `e2e/tests/admin.spec.ts` — protected routes and safe redirects after
  sign-in, generic sign-in errors, the dashboard, writing → previewing →
  publishing → deleting a post with content blocks, inline validation, the
  unsaved-changes guard, list filters and bulk actions, nesting
  certifications, media upload/alt text/in-use protection and disguised files,
  global search, and contact messages reaching the inbox.
- `e2e/tests/security.spec.ts` — CSP and hardening headers, session and CSRF
  requirements, cross-origin rejection, uncached/unindexed admin pages, safe
  headers on uploaded files, and the revalidation hook's secret.
- `e2e/a11y/a11y.spec.ts` — axe-core with the WCAG 2.0/2.1/2.2 A and AA
  rules on 13 public pages in light and dark mode, the sign-in page and five
  admin screens. Any serious or critical violation fails the test.
- `e2e/visual/visual.spec.ts` — six pages (home, a case study, a research
  page, experience, certifications, sign-in) at 360, 430, 820, 1280, 1440 and
  1920 px, plus three pages in dark mode.

### Visual baselines

Baselines live in `e2e/visual/__screenshots__`. A test fails when more than
1% of pixels differ. Animations are disabled, the caret hidden, the footer
(current year) and the trajectory figure (positioned against today's date)
masked, and `e2e/visual/screenshot.css` hides the Next.js development
overlay so `next dev` and production builds produce the same image.

After an intended design change:

```bash
npm run test:visual:update
```

Then review every changed PNG in the diff before committing. Font
rasterisation differs between operating systems, so record baselines on
Linux with the Playwright-managed Chromium — the environment CI uses.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests:

| Job                                        | Steps                                                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Lint, types and unit/integration tests     | `npm ci`, `lint`, `format:check`, `typecheck`, `npm test` with a PostgreSQL 17 service                                           |
| End-to-end, accessibility and visual tests | `npm run build`, migrate and seed a fresh database, `npx playwright test`; the HTML report and traces are uploaded when it fails |
| Docker images build                        | builds both images with the GitHub Actions cache                                                                                 |

## Writing tests

- Put tests next to the layer they exercise: logic in `packages/shared` →
  shared unit tests; an endpoint → an API integration test; a user flow →
  Playwright.
- API integration tests should go through HTTP (`request(app)`), sign in like
  a real client and send the CSRF token and `Origin` header.
- Playwright tests should use roles and accessible names rather than CSS
  selectors, and clean up what they create.

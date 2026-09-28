# Ibrahim All-Mamun — portfolio and CMS

A full-stack, database-driven portfolio for **Ibrahim All-Mamun, Data
Scientist**. The public site presents projects as case studies, research with
citations, experience, education, skills and certifications in an editorial
"working paper" design. Every piece of content is edited in a built-in admin
CMS — no deploy needed.

## What is in it

**Public site** — home page with front matter, focus areas, selected work,
approach, research and a trajectory figure; projects with search and filters
and full case studies; research pages with abstracts and copyable citations;
publications; experience and education; skills; a certifications explorer
(provider → programme → course); writing; site search; a contact form that
works without JavaScript; CV download; light and dark themes; Open Graph
cards, sitemap and JSON-LD.

**Admin CMS** (`/admin`) — dashboard, schema-driven editors for every content
type, a content-block editor (text, figures, charts from CSV, tables,
metrics, code, embeds…), draft preview and autosave, a media library with
usage tracking, contact inbox, privacy-preserving analytics, GitHub
repository curation, users and custom roles, sessions, audit log, SEO and
site settings, system status. Usable from 360 px wide.

**Engineering** — Argon2id sessions with CSRF protection and rate limits,
server-side RBAC, strict per-request CSP, validated and re-encoded uploads,
structured logs with redaction, tests at every layer (unit, integration
against PostgreSQL, end-to-end, axe accessibility, visual regression), Docker
images, Caddy with automatic HTTPS, backups and CI.

## Stack

| Part                       | Technology                                                     |
| -------------------------- | -------------------------------------------------------------- |
| Web (`apps/web`)           | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| API (`apps/api`)           | Express 5, TypeScript, Drizzle ORM, PostgreSQL, zod, pino      |
| Shared (`packages/shared`) | zod schemas, DTO types, content blocks, permissions            |
| Tests                      | Vitest, Supertest, Playwright, axe-core                        |
| Runtime                    | Node.js 22, Docker Compose, Caddy                              |

## Quick start

Requires Node.js 22.12+ and PostgreSQL 16+ (or Docker).

```bash
npm install
cp .env.example .env                 # then set APP_SECRET and REVALIDATE_SECRET
docker compose up -d postgres        # or use a local PostgreSQL, see docs/setup.md
npm run db:migrate
npm run db:seed                      # prints the admin password if SEED_ADMIN_PASSWORD is empty
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin/login
- API health: http://localhost:4000/api/health

Full instructions: [`docs/setup.md`](docs/setup.md).

## Common tasks

```bash
npm run lint && npm run format:check && npm run typecheck
npm test                  # unit + integration (PostgreSQL test database)
npm run test:e2e          # end-to-end + accessibility (running, seeded site)
npm run test:visual       # screenshot comparison
npm run db:generate -- --name <change>   # migration from schema changes
npm run build             # production builds
```

## Deploying

A single host with Docker runs `docker-compose.prod.yml`: Caddy (automatic
HTTPS), the web and API containers, a one-shot migration container and
PostgreSQL. Backups and restores are scripted. See
[`docs/deployment.md`](docs/deployment.md).

## Documentation

| Document                                   | Covers                                                |
| ------------------------------------------ | ----------------------------------------------------- |
| [architecture](docs/architecture.md)       | Components, request flows, repository layout, choices |
| [setup](docs/setup.md)                     | First-time local setup                                |
| [development](docs/development.md)         | Scripts, conventions, extending the system            |
| [database](docs/database.md)               | Schema, migrations, seed                              |
| [api](docs/api.md)                         | Endpoints, envelope, error codes                      |
| [authentication](docs/authentication.md)   | Passwords, sessions, CSRF, lockout, reset             |
| [authorization](docs/authorization.md)     | Permissions, roles, enforcement                       |
| [security](docs/security.md)               | Headers, validation, uploads, rate limits, secrets    |
| [environment](docs/environment.md)         | Every environment variable                            |
| [docker](docs/docker.md)                   | Images and Compose files                              |
| [deployment](docs/deployment.md)           | Deploy, update, roll back, back up, monitor           |
| [testing](docs/testing.md)                 | Test layers, running them, CI                         |
| [cms](docs/cms.md)                         | Using and extending the admin                         |
| [content-model](docs/content-model.md)     | Content types, rules, seeded facts                    |
| [integrations](docs/integrations.md)       | GitHub, email, revalidation                           |
| [analytics](docs/analytics.md)             | What is and is not recorded                           |
| [seo](docs/seo.md)                         | Metadata, social cards, JSON-LD, sitemap              |
| [accessibility](docs/accessibility.md)     | WCAG 2.2 AA approach and checks                       |
| [design-system](docs/design-system.md)     | Tokens, typography, colour, motion, components        |
| [troubleshooting](docs/troubleshooting.md) | Symptoms and fixes                                    |

Contributor rules (for people and AI assistants) are in
[`CLAUDE.md`](CLAUDE.md); progress is tracked in [`ROADMAP.md`](ROADMAP.md).

## Content policy

All seeded content comes from the owner's CV and the owner's own updates.
Nothing is invented: unknown dates, metrics, credential IDs and findings are
left empty for the owner to fill in through the CMS.

The bundled fonts (Newsreader, IBM Plex) are licensed under the SIL Open Font
License; see `apps/web/src/fonts`.

# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

## Project overview

A full-stack, database-driven personal portfolio and CMS for **Ibrahim
All-Mamun, Data Scientist**. The public site presents evidence (projects,
research, experience, credentials) in an editorial "working paper" design; the
admin CMS lets the owner change every piece of content without a deploy.

Read `docs/architecture.md` first, then the doc for the area you are changing.

## Tech stack

- `apps/web` — Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4
- `apps/api` — Express 5, TypeScript, Drizzle ORM, PostgreSQL 16, zod, pino
- `packages/shared` — zod schemas, content-block registry, DTO types, permissions, utilities
- Tests — Vitest (+ Supertest) and Playwright (+ axe-core)
- Runtime — Node 22, Docker Compose, Caddy in production

## Important directories

| Path                               | What lives there                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `apps/api/src/modules/<domain>`    | Routes, service and mapper per domain                                             |
| `apps/api/src/database/schema`     | Drizzle table definitions (source of truth for the schema)                        |
| `apps/api/src/database/migrations` | Generated SQL migrations (committed)                                              |
| `apps/api/src/database/seed`       | Idempotent seed (only CV/owner-provided facts)                                    |
| `apps/web/src/app/(site)`          | Public routes                                                                     |
| `apps/web/src/app/admin`           | Admin CMS routes                                                                  |
| `apps/web/src/components`          | `ui/` primitives, `site/`, `content/` (blocks, charts), feature folders, `admin/` |
| `apps/web/src/styles/tokens.css`   | Design tokens — the only place colours, type, spacing, motion are defined         |
| `packages/shared/src`              | Shared schemas/types used by both apps                                            |
| `e2e/`                             | Playwright E2E, a11y and visual tests                                             |
| `docs/`                            | Developer documentation                                                           |

## Commands

```bash
npm install                 # install all workspaces
npm run dev                 # api (4000) + web (3000) with reload
npm run build               # build shared checks, api bundle, next build
npm run typecheck           # tsc --noEmit in every workspace
npm run lint                # eslint
npm run format              # prettier --write

npm run db:generate -- --name <change>   # create SQL migration from schema changes
npm run db:migrate          # apply migrations
npm run db:seed             # idempotent seed
npm run db:reset            # drop + migrate + seed (development only)

npm test                    # unit + integration (needs PostgreSQL, see docs/testing.md)
npm run test:e2e            # Playwright functional + a11y
npm run test:visual         # Playwright screenshot regression

docker compose up           # full development stack
```

## Migration rules

- Never edit the schema by hand in SQL; change `database/schema/*.ts`, run
  `db:generate`, review and commit the SQL.
- Never modify or delete a migration that has been applied anywhere.
- Destructive changes are two-step (stop using → deploy → drop).
- Keep seed data idempotent and limited to verified facts.

## Coding conventions

- TypeScript strict; no `any` in application code (tests may use it sparingly).
- ESM everywhere. Named exports. Files `kebab-case.ts`, components `PascalCase`.
- Validate at the boundary with schemas from `@portfolio/shared`; services
  receive typed, validated input.
- Keep modules domain-oriented (`modules/projects/*`), not layer-oriented.
- Server components by default in `apps/web`; add `"use client"` only for
  interaction, and keep client islands small.
- No new dependency without checking size, maintenance, security and whether
  the platform already provides it. Document why in the PR.

## Design system rules

- Use tokens (`bg-paper`, `text-ink-2`, `border-rule`, `font-mono`, spacing
  scale). No raw hex, px font sizes, arbitrary shadows or one-off breakpoints in
  components. If a value repeats, promote it to `tokens.css`.
- Serif (Newsreader) for display/headings/prose, Plex Sans for UI, Plex Mono for
  metadata. Don't introduce new fonts.
- Rules and whitespace before boxes: do not default to card grids. Radius max
  8px. No gradients, glassmorphism or decorative charts.
- Every chart must represent real data, have a title, description, non-colour
  encoding and a data-table alternative.

## UX rules

- Evidence before claims. Empty optional sections are omitted, never padded.
- Every feature has loading, empty and error states.
- Motion is purposeful (see `docs/design-system.md` §9), transform/opacity only,
  and fully disabled by `prefers-reduced-motion`.
- Filters/search/pagination state lives in the URL.
- Touch targets ≥ 44px; visible focus on everything interactive.

## Security rules

- Authorization is enforced in the API (`requirePermission`) on every admin
  route — never rely on the Next.js UI to protect data.
- State-changing admin requests need the CSRF token and a same-origin `Origin`.
- Never log passwords, tokens, cookies or message bodies; use the logger's
  redaction list.
- Uploads: magic-byte validation, size limits, random storage keys, re-encoded
  images, no SVG/HTML.
- Secrets only via environment variables; `.env` is git-ignored.
- Markdown/HTML from the database is always sanitised before rendering.

## API conventions

- Envelope `{ success, data, meta }` / `{ success: false, error: { code, message, details } }`.
- Proper status codes; error codes listed in `docs/api.md`.
- Public endpoints return only `published` + `public` content.
- Every admin mutation writes an audit log entry and triggers web revalidation.

## Content model rules

- Do not invent facts in seed data or copy: no fabricated metrics, dates,
  credential IDs, DOIs, findings or employers. Unknown = empty + editable.
- Career facts: City Bank PLC (Data Scientist, since Aug 2026) is current;
  IDLC Finance PLC (Data Analyst) ended Aug 2026. The CV's "Present" for IDLC is
  outdated and must not be used.
- New content block types: add schema + field definitions to
  `packages/shared/src/content/blocks.ts`, a renderer in
  `apps/web/src/components/content/blocks`, and nothing else.

## Admin rules

- The admin must stay usable at 360px wide.
- Destructive actions use the confirm dialog; bulk actions report partial failures.
- New content types plug into the resource registry (`apps/web/src/components/admin/resources`).

## Deployment rules

- Production runs `docker-compose.prod.yml` (Caddy + web + api + postgres).
- Migrations run in the one-shot `migrate` service before the API starts.
- See `docs/deployment.md` for backups, rollbacks and health checks.

## Things you must NOT do

- Do not hardcode portfolio content in components.
- Do not fabricate metrics, credentials, publications or employment history.
- Do not bypass the API from the web app (no direct database access in Next.js).
- Do not weaken CSP, cookies, rate limits or upload validation to make something work.
- Do not add animation libraries, UI kits or chart libraries without a documented reason.
- Do not commit `.env`, uploads or database dumps.
- Do not edit applied migrations.

## How to safely modify the project

1. Read the relevant doc in `docs/` and the module you are touching.
2. Change shared schemas first when an API contract changes; let TypeScript
   show every affected call site.
3. Add/adjust tests next to the change (unit for logic, integration for API,
   E2E for user flows).
4. Run `npm run typecheck && npm run lint && npm test` (and E2E for UI changes).
5. Update docs when behaviour changes.

## Definition of done

A change is done when: it is typed and linted; tests cover the behaviour and
pass; loading/empty/error states exist; it works at 360px and 1440px; keyboard
and screen-reader paths work; no secrets or fabricated content were added; and
the docs describe what was built.

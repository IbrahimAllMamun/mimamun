# Development

Day-to-day work on the portfolio. Set the project up first (`setup.md`) and
read `architecture.md` for the big picture.

## Scripts

All scripts run from the repository root.

| Script                                   | What it does                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                            | API (`tsx watch`, port 4000) and web (`next dev`, port 3000) together   |
| `npm run build`                          | Bundles the API with esbuild (`apps/api/dist`) and runs `next build`    |
| `npm run start`                          | Runs both production builds                                             |
| `npm run typecheck`                      | `tsc --noEmit` in every workspace, plus the E2E test project            |
| `npm run lint`                           | ESLint (flat config in `eslint.config.mjs`)                             |
| `npm run format` / `format:check`        | Prettier write / check                                                  |
| `npm test`                               | Vitest in every workspace (API tests need PostgreSQL, see `testing.md`) |
| `npm run test:e2e`                       | Playwright end-to-end and accessibility projects                        |
| `npm run test:visual`                    | Playwright screenshot comparison                                        |
| `npm run test:visual:update`             | Re-record screenshot baselines after an intended design change          |
| `npm run db:generate -- --name <change>` | Generate a SQL migration from schema changes                            |
| `npm run db:migrate`                     | Apply pending migrations                                                |
| `npm run db:seed`                        | Idempotent seed                                                         |
| `npm run db:reset`                       | Drop everything, migrate and seed (refuses to run in production)        |

Before pushing, run what CI runs: `npm run lint && npm run format:check &&
npm run typecheck && npm test`, plus `npm run test:e2e` for UI changes.

## How the dev servers fit together

- The API reads the root `.env` (`--env-file-if-exists=../../.env`) and
  validates it with zod at start-up (`apps/api/src/config/env.ts`); an
  invalid value stops the process with a list of problems.
- `apps/web/next.config.ts` loads the root `.env` too, for variables not
  already set in the environment, so the web app and the API share one file.
- Next.js rewrites `/api/*`, `/media/*` and `/cv` to `API_INTERNAL_URL`. In a
  production build the rewrite target is fixed at build time (the Docker
  build passes `API_INTERNAL_URL=http://api:4000`).
- API logs are pretty-printed in an interactive terminal and JSON otherwise.

## Conventions in brief

`CLAUDE.md` is the authoritative list. The ones that come up most:

- TypeScript strict, ESM, named exports, `kebab-case.ts` files.
- Validate at the boundary with the zod schemas in `@portfolio/shared`;
  services receive typed input.
- API modules are domain folders (`apps/api/src/modules/<domain>`) with
  routes, service and mapper.
- Web components are server components unless they need interaction.
- Styling uses design tokens only (`apps/web/src/styles/tokens.css`); see
  `design-system.md`.
- No invented content anywhere: unknown facts stay empty and editable.

## Common changes

### Change the database schema

1. Edit the table in `apps/api/src/database/schema/*.ts`.
2. `npm run db:generate -- --name add-something` and read the generated SQL
   in `apps/api/src/database/migrations/`.
3. `npm run db:migrate`.
4. Update the zod schemas and DTOs in `packages/shared` if the API contract
   changes, then follow the type errors.

Never edit a migration that has been applied anywhere; see `database.md`.

### Add a field to an existing content type

1. Schema column + migration (above).
2. Input schema in `packages/shared/src/schemas/*` and the DTO in
   `packages/shared/src/types/*`.
3. The resource definition in `apps/api/src/modules/<domain>/resources.ts`
   (plain columns are saved automatically; relations need `saveRelations`)
   and the public mapper if the field is shown on the site.
4. The admin form: add the field to the resource in
   `apps/web/src/components/admin/resources/registry.ts`. The form engine
   renders it from its `kind`.
5. Render it in the public component, omitting it when empty.

### Add an admin-managed collection

1. Table, migration, shared input schema and list DTO.
2. `defineResource({...})` in the domain's `resources.ts`, then add it to
   `RESOURCES` in `apps/api/src/modules/admin.ts`. The generic router gives it
   list, read, create, update, delete, reorder (if it has `display_order`),
   bulk actions, status changes (if it has `status`), audit logging and web
   revalidation, all behind permission checks.
3. An `AdminResource` entry in the web registry and a sidebar item in
   `apps/web/src/components/admin/navigation.ts`.

See `cms.md` for what the registry supports.

### Add a content block type

Blocks are the building units of case studies, research sections and posts.

1. Add the type to `BLOCK_TYPES`, its zod schema and its field definitions
   in `packages/shared/src/content/blocks.ts`.
2. Add a renderer in `apps/web/src/components/content/blocks.tsx` and a
   `case` for it in `BlockView` (TypeScript flags the missing case).

The admin block editor is generated from the field definitions; nothing else
needs to change.

### Add a public page

Create the route under `apps/web/src/app/(site)`, fetch through
`publicApi` in `apps/web/src/lib/api/server.ts` (cached with the `content`
tag, so admin edits refresh it), build metadata with `pageMetadata()` from
`apps/web/src/lib/seo.ts`, and add it to `app/sitemap.ts` and, if it should
be editable, to the static route keys used by the SEO screen.

## Debugging tips

- Every API response has an `X-Request-Id`; API log lines carry the same id.
- `GET /api/admin/system` (Admin → System) shows the version, Node.js
  version, uptime, database latency and size, applied migrations, media
  totals and the last run of each integration.
- The admin **Audit log** records who changed what, with before/after values.
- If public pages show stale content, check the API log for
  `web revalidation failed`; content still refreshes within 10 minutes.

More in `troubleshooting.md`.

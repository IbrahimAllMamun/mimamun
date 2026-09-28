# Setup

How to get the portfolio running on a development machine. For day-to-day
work after that, see `development.md`; for servers, see `deployment.md`.

## Prerequisites

| Tool       | Version                                         | Notes                                                       |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------- |
| Node.js    | 22.12 or newer (`.nvmrc` pins 22)               | npm 10+ comes with it                                       |
| PostgreSQL | 16 or newer                                     | Or Docker with Compose v2, which runs PostgreSQL 17 for you |
| Docker     | optional                                        | Only for the Compose database, Mailpit or containers        |
| Chromium   | optional, via `npx playwright install chromium` | Only for the end-to-end tests                               |

## 1. Install dependencies

```bash
npm install
```

This installs all three workspaces (`apps/api`, `apps/web`,
`packages/shared`). `@portfolio/shared` is consumed as TypeScript source, so
there is no separate build step for it.

## 2. Create `.env`

```bash
cp .env.example .env
```

The defaults work for local development. Change at least:

- `APP_SECRET` — any 32+ random characters (`openssl rand -base64 48`).
- `REVALIDATE_SECRET` — another random string; the API and the web app must
  share it.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — the first admin account. Leave
  the password empty and the seed generates one and prints it once. Setting
  it to `local-admin-password-123` matches the end-to-end tests' default
  (see `testing.md`).

Every variable is described in `environment.md`. `.env` is git-ignored.

## 3. Start PostgreSQL

**With Docker** (recommended):

```bash
docker compose up -d postgres
```

This starts PostgreSQL 17 on `127.0.0.1:5432` with the credentials from
`.env` and also creates the `portfolio_test` database used by the API
integration tests (`docker/postgres-init.sql`).

**With a local PostgreSQL**, create the role and both databases once:

```sql
CREATE ROLE portfolio LOGIN PASSWORD 'portfolio';
CREATE DATABASE portfolio OWNER portfolio;
CREATE DATABASE portfolio_test OWNER portfolio;
```

## 4. Migrate and seed

```bash
npm run db:migrate
npm run db:seed
```

The seed is idempotent: it inserts what is missing and never overwrites
content you have edited. It creates the Administrator and Editor roles, the
first admin account (only when there are no users yet), and the portfolio
content supported by the CV and the owner's own updates — see
`content-model.md`.

## 5. Run

```bash
npm run dev
```

| URL                                 | What                             |
| ----------------------------------- | -------------------------------- |
| http://localhost:3000               | Public site (Next.js dev server) |
| http://localhost:3000/admin/login   | Admin CMS                        |
| http://localhost:4000/api/health    | API liveness                     |
| http://localhost:4000/api/health/db | API database readiness           |

The browser only ever talks to port 3000: Next.js forwards `/api/*`,
`/media/*` and `/cv` to the API, so cookies stay first-party.

After the first sign-in, change the password under **Account**.

## Optional services

### Email (Mailpit)

```bash
docker compose --profile mail up -d
```

Then set in `.env` and restart `npm run dev`:

```bash
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
MAIL_FROM="Portfolio <portfolio@localhost>"
```

Password-reset and contact-notification emails appear at
http://localhost:8025. Without SMTP the API still stores contact messages,
and in development it logs password-reset links instead of sending them.

### GitHub repositories

The seed sets the GitHub username. Run a sync from **Admin → Integrations**,
and turn on **Sync repositories automatically** under **Admin → Settings →
GitHub** for scheduled syncs. `GITHUB_TOKEN` is optional; it only raises
GitHub's rate limit. See `integrations.md`.

## Everything in containers

To run the built images locally instead of the dev servers:

```bash
docker compose --profile app up --build
docker compose --profile app run --rm api node dist/seed.js   # first time only
```

The `migrate` service applies migrations before the API starts. The site is
on http://localhost:3000. See `docker.md` for what each service does.

## Next steps

- `development.md` — scripts, conventions and how to extend the system
- `testing.md` — running the test suites
- `troubleshooting.md` — when something does not start

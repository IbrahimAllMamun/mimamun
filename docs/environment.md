# Environment variables

All configuration comes from environment variables. For development, copy
`.env.example` to `.env` at the repository root; both apps read it. In
production the API reads `.env.production` through Compose (see
`deployment.md`). Never commit either file.

The API validates its variables with zod when it starts
(`apps/api/src/config/env.ts`) and exits with a list of problems if something
is missing or malformed. An empty value counts as "not set".

## Application

| Variable      | Used by  | Default                 | Notes                                                                                                                                                                           |
| ------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`    | api, web | `development`           | `development`, `test` or `production`. Production enables secure cookies and the strict start-up checks below                                                                   |
| `APP_URL`     | api, web | `http://localhost:3000` | The public origin. API: CSRF origin check and links in emails. Web: canonical URLs, sitemap, robots, Open Graph and JSON-LD, read **at runtime**. Must be `https` in production |
| `APP_SECRET`  | api      | development-only value  | **Required in production**, 32+ random characters. Signs contact-form tokens and keys the contact IP hash. `openssl rand -base64 48`                                            |
| `APP_VERSION` | api      | package version         | Shown on the System screen                                                                                                                                                      |

## Web ↔ API

| Variable            | Used by  | Default                 | Notes                                                                                                                                                                                                                        |
| ------------------- | -------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_INTERNAL_URL`  | web      | `http://localhost:4000` | How the Next.js server reaches the API. Server-side fetches read it at runtime; the `/api`, `/media` and `/cv` rewrites are **fixed at build time**, so the Docker build receives it as a build argument (`http://api:4000`) |
| `WEB_INTERNAL_URL`  | api      | unset                   | How the API reaches Next.js to revalidate cached pages (`http://web:3000` in Compose). Without it (or without `REVALIDATE_SECRET`) the API skips the call and pages refresh within 10 minutes                                |
| `REVALIDATE_SECRET` | api, web | unset                   | Shared secret for `POST /internal/revalidate`. The web route refuses every request while it is empty                                                                                                                         |

## API server

| Variable       | Default                                       | Notes                                                                                                                                                                             |
| -------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HOST`, `PORT` | `0.0.0.0`, `4000`                             | Listen address                                                                                                                                                                    |
| `TRUST_PROXY`  | `loopback, linklocal, uniquelocal`            | Express `trust proxy`: which proxies may set `X-Forwarded-For`. The default trusts private networks such as the Compose network. `true`, `false` or a hop count are also accepted |
| `LOG_LEVEL`    | `debug` (dev), `info` (prod), `silent` (test) | `fatal` … `trace`, or `silent`                                                                                                                                                    |
| `JOBS_ENABLED` | `true`                                        | In-process scheduler (daily maintenance, GitHub sync). Run it on one instance only                                                                                                |

## Database

| Variable                                            | Default                                                        | Notes                                                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                      | —                                                              | **Required.** `postgres://user:password@host:5432/db`. The Compose files build it from `POSTGRES_*`      |
| `DATABASE_POOL_MAX`                                 | `10`                                                           | Connection pool size                                                                                     |
| `DATABASE_SSL`                                      | `disable`                                                      | `require` or `no-verify` for a managed database that needs TLS                                           |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `portfolio` ×3                                                 | Used by the Compose database container. In production `POSTGRES_PASSWORD` is required and must be strong |
| `TEST_DATABASE_URL`                                 | `postgres://portfolio:portfolio@localhost:5432/portfolio_test` | API integration tests only. The test run **drops and recreates** this database's schema                  |

## Sessions and sign-in

| Variable                     | Default                                          | Notes                                                                    |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| `SESSION_TTL_HOURS`          | `168`                                            | Absolute session lifetime (max 90 days)                                  |
| `SESSION_IDLE_TIMEOUT_HOURS` | `12`                                             | Sign-out after this long without a request                               |
| `COOKIE_SECURE`              | `true` in production, else `false`               | Only set `false` to test a production build over plain HTTP              |
| `SESSION_COOKIE_NAME`        | `__Host-portfolio_session` / `portfolio_session` | Override only if you know why; the web proxy looks for the default names |
| `LOGIN_MAX_ATTEMPTS`         | `5`                                              | Failed sign-ins before a temporary lock (3–50)                           |
| `LOGIN_LOCKOUT_MINUTES`      | `15`                                             | Lock length and the per-email limit window                               |

## First admin account (seed only)

| Variable              | Notes                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `SEED_ADMIN_EMAIL`    | Defaults to the profile email in the seed data                                                                                     |
| `SEED_ADMIN_PASSWORD` | At least 12 characters. Empty in development: a password is generated and printed once. Empty in production: no account is created |
| `SEED_ADMIN_NAME`     | Defaults to the profile name                                                                                                       |

The seed creates this account only when the `users` table is empty.

## Uploads

| Variable                 | Default   | Notes                                                                                          |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------- |
| `UPLOAD_DIR`             | `uploads` | Relative to the API's working directory. The Compose files set `/data/uploads`, a named volume |
| `UPLOAD_MAX_IMAGE_MB`    | `10`      | 1–50                                                                                           |
| `UPLOAD_MAX_DOCUMENT_MB` | `20`      | 1–100                                                                                          |
| `UPLOAD_MAX_VIDEO_MB`    | `100`     | 1–500. Caddy also caps request bodies at 120 MB                                                |

## Email (optional)

| Variable                     | Default | Notes                                                                        |
| ---------------------------- | ------- | ---------------------------------------------------------------------------- |
| `SMTP_HOST`                  | unset   | Unset disables email. Contact messages are still stored                      |
| `SMTP_PORT`                  | `587`   |                                                                              |
| `SMTP_SECURE`                | `false` | `true` for implicit TLS (port 465); STARTTLS is negotiated otherwise         |
| `SMTP_USER`, `SMTP_PASSWORD` | unset   | Omit for servers without authentication                                      |
| `MAIL_FROM`                  | unset   | **Required when `SMTP_HOST` is set**, e.g. `Portfolio <noreply@example.com>` |

Where contact notifications go is a CMS setting (**Settings → Contact form**),
not an environment variable.

## GitHub (optional)

| Variable                       | Default                  | Notes                                                                                                       |
| ------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`                 | unset                    | Raises the API rate limit. A fine-grained token with no extra permissions is enough for public repositories |
| `GITHUB_API_URL`               | `https://api.github.com` | For GitHub Enterprise or tests                                                                              |
| `GITHUB_SYNC_INTERVAL_MINUTES` | `360`                    | 15 minutes to 7 days; automatic sync must also be enabled in Settings                                       |

The GitHub username is a CMS setting.

## Analytics (optional)

| Variable                   | Default | Notes                                                                                                           |
| -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `ANALYTICS_COUNTRY_HEADER` | unset   | A request header with a two-letter country code set by your CDN (e.g. `cf-ipcountry`). Unset records no country |

Whether analytics run at all, and the retention period, are CMS settings.

## Production Compose only

Read by `docker-compose.prod.yml` for interpolation (`--env-file
.env.production`).

| Variable      | Notes                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| `SITE_DOMAIN` | **Required.** The domain Caddy serves and gets a certificate for; `www.` redirects to it |
| `ACME_EMAIL`  | Contact address for certificate notices                                                  |
| `IMAGE_TAG`   | Tag for the built images (default `latest`); use a git SHA to keep rollback targets      |

## End-to-end tests only

| Variable                                | Default                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `E2E_BASE_URL`, `E2E_API_URL`           | `http://localhost:3000`, `http://localhost:4000`                                                  |
| `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` | fall back to `SEED_ADMIN_*` from the shell, then `admin@example.com` / `local-admin-password-123` |

Playwright does not read `.env`; see `testing.md`.

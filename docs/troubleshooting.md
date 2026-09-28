# Troubleshooting

Symptoms, causes and fixes for problems that come up in development and
operation. API log lines carry a request id that matches the `X-Request-Id`
response header; start there.

## Start-up

**The API exits with `Invalid environment configuration`.**
The message lists each bad variable. Common cases: `APP_SECRET` shorter than
32 characters or `APP_URL` not `https` while `NODE_ENV=production`, or
`SMTP_HOST` set without `MAIL_FROM`. See `environment.md`.

**`ECONNREFUSED 127.0.0.1:5432`** (API, migrations or tests).
PostgreSQL is not running or not on that port. `docker compose up -d
postgres`, or start your local server, and check `DATABASE_URL`.

**`EADDRINUSE` on port 3000 or 4000.**
Another dev server is still running. Stop it (`fuser -k 3000/tcp`, or
`lsof -i :3000` and kill the process).

**Changes to `.env` have no effect.**
Both apps read `.env` when they start. Restart `npm run dev`.

## Signing in

**"Invalid email or password" right after seeding.**
The seed creates the admin account only when there are no users, and prints a
generated password once when `SEED_ADMIN_PASSWORD` is empty — look for it in
the seed output. In development `npm run db:reset` starts over.

**"Too many sign-in attempts".**
Either the account is locked (after `LOGIN_MAX_ATTEMPTS` failures, for
`LOGIN_LOCKOUT_MINUTES`) or a rate limit was reached. Wait, or have an
administrator use **Users → Unlock**. The rate-limit counters live in the API
process, so restarting the API clears them in development.

**`403 CSRF_INVALID` — "Request origin not allowed".**
The browser's origin differs from `APP_URL`, e.g. `http://127.0.0.1:3000`
versus `http://localhost:3000`, or a different port. Open the site at exactly
the `APP_URL` origin, or change `APP_URL`.

**Signed in, but the next request is anonymous (production build over plain
HTTP).**
In production the session cookie is `Secure` and is dropped on `http://`.
Use HTTPS, or set `COOKIE_SECURE=false` only for local testing of a
production build.

## Content

**Edits do not appear on the public site.**
The API asks the web app to refresh after each change. Check the API log for
`web revalidation rejected` (the two `REVALIDATE_SECRET` values differ) or
`web revalidation failed` (`WEB_INTERNAL_URL` is wrong or the web app is
down). Pages still refresh on their own within 10 minutes. Also check that
the record is **published**, **public** and, where it applies, **shown**.

**A section or navigation item is missing.**
Empty sections are omitted by design, and Writing and Publications are
hidden in the navigation until they have content — show them under
**Navigation** once they do.

**The "Download CV" link opens the contact page.**
No CV is uploaded yet. Add one under **Profile & CV**.

**The GitHub section is empty.**
Run **Sync now** under **Integrations** and tick the repositories to show.
A sync error such as `rate limit exceeded` is shown there; add a
`GITHUB_TOKEN` or wait an hour. The site keeps the last good data meanwhile.

**Contact notifications do not arrive.**
Check **Settings → Contact form → Send notifications to**, the `SMTP_*` and
`MAIL_FROM` variables, and the API log for `email delivery failed`. Messages
are stored either way (see **Messages**). Submissions marked as spam never
notify.

## Uploads

| Response                            | Cause                                                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `415` "Unsupported file type"       | The file's content is not JPEG, PNG, WebP, AVIF, PDF, MP4 or WebM, whatever its extension                                               |
| `415` "PDFs with scripts…"          | The PDF contains JavaScript, attachments or launch actions; export a plain PDF                                                          |
| `415` "The image could not be read" | Corrupt image, or larger than 60 megapixels                                                                                             |
| `413`                               | Over `UPLOAD_MAX_*_MB`, or over Caddy's 120 MB request limit                                                                            |
| `409` on delete                     | The file is used by content; the error lists where                                                                                      |
| `EACCES … mkdir` at API start       | `UPLOAD_DIR` is not writable by the API user. The Compose files use the `/data/uploads` volume; do not override it with a relative path |

## Docker and deployment

**`migrate` fails, so the API never starts.**
Read `docker compose -f docker-compose.prod.yml --env-file .env.production
logs migrate`. A password error after changing `POSTGRES_PASSWORD` means the
database volume was initialised with the old one — PostgreSQL only reads that
variable when the volume is first created. Change the password inside
PostgreSQL (`ALTER ROLE`) or restore the old value.

**Caddy does not get a certificate.**
The domain's DNS must point at the host and ports 80 and 443 must be open to
the internet. See `docker compose … logs caddy`.

**The web container answers `/api/*` with errors when used without Caddy.**
Its rewrites were fixed when the image was built. Rebuild with the right
`API_INTERNAL_URL` build argument, or put Caddy (which routes `/api`, `/media`
and `/cv` to the API itself) in front.

**Visitors all appear to come from one IP address.**
The proxy in front of the API is not trusted. With the provided Compose
files this works out of the box; with a CDN or load balancer in front of
Caddy, configure Caddy's `trusted_proxies` (see `security.md`).

## Tests

**API tests fail with connection or "database does not exist" errors.**
They need `portfolio_test` (or `TEST_DATABASE_URL`). The Compose database
creates it; for a local PostgreSQL create it as shown in `setup.md`.

**Playwright global setup: "Could not sign in".**
Playwright does not read `.env`. Export `E2E_ADMIN_EMAIL` and
`E2E_ADMIN_PASSWORD` (or `SEED_ADMIN_*`) matching your admin account, or seed
with the defaults in `testing.md`. A `429` there means the sign-in limit was
hit: wait 15 minutes or restart the API.

**Visual tests fail after a change that should not affect them.**
Open the diff images in `test-results/`. Font rendering differs between
operating systems, so compare on Linux with the Playwright Chromium. If the
change is intended, run `npm run test:visual:update` and review the new
baselines before committing.

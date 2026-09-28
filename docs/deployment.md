# Deployment

The supported production setup is a single Linux host running
`docker-compose.prod.yml`: Caddy (TLS and routing), the web and API
containers, a one-shot migration container and PostgreSQL. Image and service
details are in `docker.md`; every variable is described in `environment.md`.

## Requirements

- A Linux host with Docker Engine and the Compose v2 plugin (2 GB RAM is
  comfortable for building images on the host).
- DNS `A`/`AAAA` records for the domain and `www.` pointing at the host.
- Ports 80 and 443 (TCP) and 443 (UDP, optional HTTP/3) reachable from the
  internet — Caddy needs them to obtain and renew certificates.

## First deployment

```bash
git clone <repository> /srv/portfolio && cd /srv/portfolio
cp .env.example .env.production
chmod 600 .env.production
```

Edit `.env.production`. At minimum:

| Variable                                  | Value                                                         |
| ----------------------------------------- | ------------------------------------------------------------- |
| `SITE_DOMAIN`                             | `example.com` (the bare domain)                               |
| `APP_URL`                                 | `https://example.com`                                         |
| `ACME_EMAIL`                              | an address for certificate notices                            |
| `APP_SECRET`                              | `openssl rand -base64 48`                                     |
| `REVALIDATE_SECRET`                       | `openssl rand -base64 48`                                     |
| `POSTGRES_PASSWORD`                       | a long random password                                        |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | the first admin account (password ≥ 12 characters)            |
| `SMTP_*`, `MAIL_FROM`                     | optional, for contact notifications and password-reset emails |

`NODE_ENV`, `DATABASE_URL`, `WEB_INTERNAL_URL` and `UPLOAD_DIR` are set by
the Compose file and need no changes.

Build and start:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Seed once (roles, the first admin account and the initial content):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api node dist/seed.js
```

Then:

1. Open `https://<domain>/api/health/db` — expect `{"success":true,"data":{"status":"ok",…}}`.
2. Sign in at `https://<domain>/admin/login` and change the password under
   **Account**.
3. Remove `SEED_ADMIN_PASSWORD` from `.env.production`; it is not needed
   again (the seed only creates an account when there are no users).
4. Review **Settings** (contact notification address, analytics, GitHub) and
   upload the CV and portrait under **Profile & CV**.
5. Schedule backups (below).

## Updating

```bash
cd /srv/portfolio
scripts/backup.sh /srv/backups          # always back up first
git pull
IMAGE_TAG=$(git rev-parse --short HEAD) \
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Tagging images with the commit keeps the previous images on the host as
rollback targets. On `up`, the `migrate` service applies pending migrations
before the new API starts. If a migration fails, Compose does not start the
new API: read the `migrate` service's logs, then fix forward or roll back
(below).

Afterwards check `/api/health/db`, **Admin → System** (version and applied
migrations) and the logs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api web
```

## Rolling back

**No migration in the release** — start the previous images again:

```bash
IMAGE_TAG=<previous-sha> \
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

**The release included migrations** — migrations only move forward. The
project's rule that destructive schema changes are split across two releases
(stop using a column → deploy → drop it later) means the previous image
normally still works with the newer schema, so the command above applies. If
it does not, restore the backup taken before the update (below) and then
start the previous images.

## Backups

`scripts/backup.sh [directory]` writes two files:

- `db-<timestamp>.dump` — `pg_dump` in custom format (restorable with
  `pg_restore`, selectively if needed);
- `uploads-<timestamp>.tar.gz` — the uploads volume.

It keeps the newest 14 of each (`KEEP_BACKUPS` overrides). Run it nightly
from cron and copy the directory off the host (object storage, another
machine):

```cron
15 3 * * * cd /srv/portfolio && scripts/backup.sh /srv/backups >> /var/log/portfolio-backup.log 2>&1
```

Caddy's certificates live in the `caddy-data` volume; losing them only means
Caddy requests new ones.

### Restoring

```bash
scripts/restore.sh /srv/backups/db-20260101T031500Z.dump /srv/backups/uploads-20260101T031500Z.tar.gz
```

The script asks for confirmation, stops `web` and `api`, restores the
database with `pg_restore --clean --if-exists`, replaces the uploads (when an
archive is given) and starts everything again, which also applies any
migrations newer than the backup.

Practise a restore on a scratch host from time to time; a backup that has
never been restored is a hope, not a backup.

## Health checks and monitoring

| Check                | Where                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `GET /api/health`    | API process is serving (used by the container health check)                              |
| `GET /api/health/db` | Database reachable; `503 SERVICE_UNAVAILABLE` otherwise                                  |
| `GET /robots.txt`    | Web container health check                                                               |
| **Admin → System**   | Version, uptime, database latency and size, migrations, media totals, integration status |
| `docker compose ps`  | Health state of every container                                                          |

Point an external uptime monitor at `/api/health/db` and the home page.

Logs are JSON on stdout (API with request ids, Caddy access logs). Docker's
default `json-file` driver does not rotate logs; set `max-size` and
`max-file` in `/etc/docker/daemon.json` on the host.

## Operating notes

- Run one API instance. Rate limits are kept in memory and the scheduler
  should run once (see `security.md`).
- The API trusts `X-Forwarded-For` only from private networks such as the
  Compose network. If a CDN or load balancer sits in front of Caddy,
  configure Caddy's `trusted_proxies` so visitors' addresses stay correct.
- Rotating `APP_SECRET` invalidates contact-form tokens that are open in
  browsers at that moment (those submissions are marked as spam) and changes
  the key of future contact IP hashes. After changing `REVALIDATE_SECRET`,
  run `up -d` again so both `api` and `web` are recreated with the new value.
- Uploaded files and the database are the only state. Everything else can be
  rebuilt from the repository.

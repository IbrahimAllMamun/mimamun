# Integrations

External services are optional. Each sits behind a small interface, fails
without breaking the site, and reports its state on **Admin → System** and
**Admin → Integrations**.

| Integration      | Purpose                                     | Code                                                                               | Needs                                   |
| ---------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------- |
| GitHub           | Show selected public repositories           | `apps/api/src/integrations/github`                                                 | a username (token optional)             |
| Email (SMTP)     | Contact notifications, password-reset links | `apps/api/src/integrations/mailer.ts`                                              | `SMTP_*`, `MAIL_FROM`                   |
| Web revalidation | Refresh cached public pages after edits     | `apps/api/src/integrations/revalidator.ts`, `apps/web/src/app/internal/revalidate` | `WEB_INTERNAL_URL`, `REVALIDATE_SECRET` |

## GitHub

### How it works

1. The GitHub username is set under **Admin → Settings → GitHub** (the seed
   sets it).
2. A sync (`POST /api/admin/integrations/github/sync`, the **Sync now**
   button, or the scheduler) calls the GitHub REST API:
   `GET /users/{username}/repos?type=owner&sort=pushed` (up to 100
   repositories) and, for each _selected_ repository,
   `GET /repos/{owner}/{repo}/languages`. Requests time out after 10 s.
3. Repository metadata (name, description, URL, homepage, language, topics,
   stars, forks, fork/archived flags, last push) is upserted into
   `github_repositories`. **Curation fields are never overwritten**: whether
   a repository is shown, its order, a custom description and a linked
   project.
4. Repositories that disappeared from GitHub are removed unless they are
   selected for display.
5. The public site reads only this table (`GET /api/public/github`), so a
   GitHub outage or rate limit never affects page rendering. The projects
   page shows the selected repositories, each with its custom description
   when set and a link to its case study when linked.

On failure the cached rows stay untouched and the error, with its time, is
stored in `integration_status` and shown in the admin; a manual sync answers
`503` with the reason.

### Curation

**Admin → Integrations** (`integrations:manage`) lists every synced
repository. Tick the ones to show, order them, write a custom description, and
link a repository to a project. Each change is audited and refreshes the
public pages.

### Schedule and limits

- Automatic sync runs every `GITHUB_SYNC_INTERVAL_MINUTES` (default 6 hours)
  when **Sync repositories automatically** is on, starting 30 seconds after
  the API starts. It needs `JOBS_ENABLED=true`.
- Without a token GitHub allows 60 requests per hour per IP address, enough
  for the default schedule. `GITHUB_TOKEN` (a fine-grained token with no
  extra permissions) raises that limit. Only public data is read.
- `GITHUB_API_URL` points the client at another API root (GitHub Enterprise,
  tests).

## Email

`SmtpMailer` (nodemailer) is used when `SMTP_HOST` is set. Otherwise
`DisabledMailer` logs that an email was not sent (subject only) and the rest
of the system behaves the same; the dashboard's setup checklist shows SMTP
as not configured.

| Email                | Sent to                                             | When                                                   |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Contact notification | **Settings → Contact form → Send notifications to** | a non-spam contact message arrives                     |
| Password reset link  | the account's email                                 | `POST /api/auth/password/forgot` for an active account |

- Messages are plain text. Contact notifications set `Reply-To` to the
  visitor, so replying from the mail client answers them directly.
- Delivery failures are logged (without the body) and never fail the request:
  the contact message is stored regardless, and `notified_at` records whether
  the notification went out.
- Connection, greeting and socket timeouts are 10, 10 and 20 seconds.
- For local testing use Mailpit (`setup.md`).

## Web revalidation

Public pages cache their API data in the Next.js data cache with the
`content` tag and a 10-minute fallback. After every content mutation the API
calls `POST {WEB_INTERNAL_URL}/internal/revalidate` with the
`x-revalidate-secret` header:

- calls are debounced (300 ms) so a bulk edit triggers one request;
- the web route checks the secret in constant time and expires the
  `content` tag;
- failures are logged as warnings; pages then refresh through the fallback
  within 10 minutes.

Caddy blocks `/internal/*` from the internet; the API reaches the web
container over the Compose network.

## Not implemented

Importing publication metadata from DOIs (e.g. Crossref) is not part of this
version; publications are entered in the CMS. See `ROADMAP.md`.

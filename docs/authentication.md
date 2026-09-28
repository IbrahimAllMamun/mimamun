# Authentication

The admin CMS uses server-side sessions stored in PostgreSQL, a cookie that
holds only a random token, and a per-session CSRF token. There is no public
sign-up: accounts are created by an administrator (or by the seed for the
first account). Code: `apps/api/src/modules/auth`, `middleware/session.ts`,
`middleware/csrf.ts`, `lib/password.ts`.

## Passwords

- Hashed with **Argon2id** (`@node-rs/argon2`): 19 MiB memory, 2 passes,
  1 lane — the OWASP baseline. Parameters are stored in each hash, so they
  can be raised later without breaking existing hashes.
- Policy (`packages/shared/src/schemas/auth.ts`): 12–128 characters and at
  least 5 distinct characters. Length over composition rules, as NIST
  SP 800-63B recommends. The login form accepts any length up to 128 so an
  old password keeps working after a policy change.
- Passwords, hashes and tokens are redacted by the logger (`REDACT_PATHS` in
  `lib/logger.ts`) and stripped from audit-log snapshots.

## Signing in

`POST /api/auth/login` with `{ email, password }`:

1. Rate limits run first (see below).
2. The user is looked up by lower-cased email. For an unknown email the API
   still verifies the password against a dummy Argon2 hash, so response time
   does not reveal whether an account exists.
3. A wrong password, a disabled account and an unknown email all return the
   same `401 INVALID_CREDENTIALS` ("Invalid email or password").
4. On success any session already on the request is revoked (prevents session
   fixation), a new session is created, `last_login_at` is set, the failure
   counter resets and an audit entry is written.

The response contains the user, their role and permissions, the CSRF token and
the session expiry, and sets the session cookie.

### Lockout and rate limits

| Limit                    | Scope                            | Behaviour                                                                                                             |
| ------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Account lockout          | per account                      | After `LOGIN_MAX_ATTEMPTS` (default 5) wrong passwords the account is locked for `LOGIN_LOCKOUT_MINUTES` (default 15) |
| Failed sign-ins by email | per submitted email address      | `LOGIN_MAX_ATTEMPTS` failures per `LOGIN_LOCKOUT_MINUTES`, counted for every address — known or not                   |
| Failed sign-ins by IP    | per client IP                    | 30 failures per 15 minutes                                                                                            |
| Password-reset requests  | per IP (and email, for "forgot") | 5 per hour, shared by the "forgot" and "reset" endpoints                                                              |

Only failed sign-ins count toward the sign-in limits. All of them answer
`429 RATE_LIMITED` with a `Retry-After` header and the same message, so a
locked account cannot be told apart from an unknown address that hit its
limit. An administrator can clear a lockout early with **Users → Unlock**
(`POST /api/admin/users/:id/unlock`).

The rate limiter keeps its counters in memory, which is correct for the single
API instance this project deploys. See `security.md` before running more than
one instance.

## Sessions

| Property     | Value                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Token        | 32 random bytes (base64url) in the cookie                                                                                               |
| Storage      | `sessions` row keyed by the **SHA-256 of the token**; the raw token is never stored                                                     |
| Lifetime     | `SESSION_TTL_HOURS` absolute (default 168 = 7 days)                                                                                     |
| Idle timeout | `SESSION_IDLE_TIMEOUT_HOURS` without a request (default 12)                                                                             |
| Activity     | `last_seen_at` is refreshed at most once a minute                                                                                       |
| Revocation   | sign-out, password change (other sessions), password reset (all sessions), disabling a user or changing their role, the Sessions screen |
| Cleanup      | the daily maintenance job deletes expired sessions and ones revoked more than 7 days ago                                                |

A session is valid only while it is unrevoked, unexpired, not idle past the
timeout and its user is `active`. Permissions are loaded with the session on
every request, so a role change applies immediately.

### Cookie

| Attribute  | Value                                                                                  |
| ---------- | -------------------------------------------------------------------------------------- |
| Name       | `__Host-portfolio_session` when secure (production), `portfolio_session` otherwise     |
| `HttpOnly` | yes — scripts cannot read it                                                           |
| `Secure`   | yes in production (`COOKIE_SECURE` overrides; only set `false` for plain-HTTP testing) |
| `SameSite` | `Lax`                                                                                  |
| `Path`     | `/`, no `Domain` (required by the `__Host-` prefix)                                    |
| Expiry     | the session's absolute expiry                                                          |

The site, the admin and the API share one origin (Caddy in production,
Next.js rewrites in development), so the cookie is always first-party and no
CORS configuration exists.

## CSRF protection

Two independent checks run on every `POST`, `PUT`, `PATCH` and `DELETE` under
`/api/auth` and `/api/admin`:

1. **Origin check** — the `Origin` header (or `Referer` when a privacy tool
   strips `Origin`) must equal the origin of `APP_URL`. Requests without
   either header are rejected too.
2. **Synchronizer token** — when a session exists, the `X-CSRF-Token` header
   must match the token stored with that session (constant-time comparison).
   The token is returned by `POST /api/auth/login` and
   `GET /api/auth/session`; the admin client sends it automatically
   (`apps/web/src/lib/api/client.ts`).

`SameSite=Lax` on the cookie is a third layer. Failures answer
`403 CSRF_INVALID`.

## Password reset

1. `POST /api/auth/password/forgot` `{ email }` always answers `202` with the
   same message.
2. For an active account the API invalidates older reset tokens, stores the
   SHA-256 of a new 32-byte token (valid for **one hour**, single use) and
   emails a link to `/admin/reset-password?token=…`. Without SMTP the link is
   written to the API log in development only.
3. `POST /api/auth/password/reset` `{ token, password }` checks the token
   inside a transaction (`SELECT … FOR UPDATE`), sets the password, clears
   any lockout and **revokes every session** of the user.

Used and expired tokens are deleted by the maintenance job.

## Changing a password

`POST /api/auth/password/change` `{ currentPassword, newPassword }` requires
the current password, rejects a new password equal to the current one, and
revokes the user's other sessions (the current one stays signed in).

## The web side

- `apps/web/src/proxy.ts` redirects requests for `/admin/*` (except the
  sign-in and password pages) and `/preview/*` to `/admin/login?next=…` when
  no session cookie is present. This is a convenience only: the API
  authorises every request itself.
- `safeNext()` (`apps/web/src/lib/redirects.ts`) only allows returning to
  `/admin` or `/preview` paths, so the `next` parameter cannot be used as an
  open redirect.
- An expired session in the admin sends the user to the sign-in page with a
  notice and returns them to where they were afterwards.

## Not implemented

Two-factor authentication and single sign-on are not part of this version
(see `ROADMAP.md`).

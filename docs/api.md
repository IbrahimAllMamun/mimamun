# API

The Express API (`apps/api`) is served under `/api`. It is the only component
that talks to PostgreSQL. Routes are grouped by audience so that authorization
rules are obvious from the URL.

| Prefix           | Audience                 | Auth                                    | Notes                                                   |
| ---------------- | ------------------------ | --------------------------------------- | ------------------------------------------------------- |
| `/api/health`    | Operators, orchestrators | none                                    | Liveness / database readiness. Never exposes internals. |
| `/api/auth`      | Admin users              | session (except login/reset)            | Login, logout, session, password flows                  |
| `/api/public`    | Everyone                 | none                                    | Published, public content only. Cacheable.              |
| `/api/analytics` | Browsers                 | none                                    | Privacy-preserving event ingestion, rate limited        |
| `/api/admin`     | Admin users              | session + permission (+ CSRF on writes) | CMS operations                                          |
| `/media/:key`    | Everyone                 | none                                    | Uploaded files (immutable cache)                        |
| `/cv`            | Everyone                 | none                                    | Redirects to the current CV and records a download      |

## Conventions

### Response envelope

Success:

```json
{ "success": true, "data": {}, "meta": { "page": 1, "pageSize": 20, "total": 42 } }
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [{ "path": "title", "message": "Title is required" }]
  }
}
```

| Code                     | HTTP | Meaning                                                            |
| ------------------------ | ---- | ------------------------------------------------------------------ |
| `VALIDATION_ERROR`       | 400  | Body/query failed schema validation (`details` lists fields)       |
| `UNAUTHENTICATED`        | 401  | No valid session                                                   |
| `INVALID_CREDENTIALS`    | 401  | Login failed (deliberately generic)                                |
| `CSRF_INVALID`           | 403  | Missing/invalid `X-CSRF-Token` or foreign `Origin`                 |
| `FORBIDDEN`              | 403  | Authenticated but lacking the permission                           |
| `NOT_FOUND`              | 404  | Resource does not exist (or is not public)                         |
| `CONFLICT`               | 409  | Unique slug clash, media in use, last-admin protection             |
| `PAYLOAD_TOO_LARGE`      | 413  | Body or upload over the limit                                      |
| `UNSUPPORTED_MEDIA_TYPE` | 415  | Upload content does not match an allowed type                      |
| `RATE_LIMITED`           | 429  | Too many requests or a temporarily locked account (`Retry-After`)  |
| `INTERNAL_ERROR`         | 500  | Unexpected error (logged with request id; no stack trace returned) |
| `SERVICE_UNAVAILABLE`    | 503  | Database unavailable                                               |

Every response carries `X-Request-Id`; include it when reporting problems.

### Lists

Admin list endpoints accept `page` (1-based), `pageSize` (default 25, at most
100), `q` (text search), `status`, `featured`, `visible`, `type`, `parent` and
`sort`. `sort` is one of the named orders a resource defines (for example
`title`); anything else falls back to the resource's default order (usually
the display order). Lists return `meta: { page, pageSize, total, totalPages }`.

Public lists are narrower: projects accept `q, category, tech, year, type,
featured, sort, page, pageSize` (at most 50) and also return `facets` for the
filter controls; the blog accepts `q, category, tag, page, pageSize`.

### Writes

- Content type `application/json` (uploads use `multipart/form-data`).
- Every `POST`/`PUT`/`PATCH`/`DELETE` under `/api/auth` and `/api/admin` must
  come from the site origin (`Origin`, or `Referer` when `Origin` is absent).
  When a session exists the request also needs `X-CSRF-Token` (value from
  `GET /api/auth/session` or the login response). See `authentication.md`.
- Input is validated with the zod schemas from `@portfolio/shared`; unknown
  keys are stripped.

## Endpoints

### Health

| Method | Path             | Description                                     |
| ------ | ---------------- | ----------------------------------------------- |
| GET    | `/api/health`    | `{ status: "ok" }` while the process is serving |
| GET    | `/api/health/db` | `{ status: "ok", latencyMs }` or 503            |

### Authentication

| Method | Path                        | Description                                                                        |
| ------ | --------------------------- | ---------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`           | `{ email, password }` → sets session cookie, returns user, permissions, CSRF token |
| POST   | `/api/auth/logout`          | Revokes the current session                                                        |
| GET    | `/api/auth/session`         | Current user, permissions, CSRF token                                              |
| POST   | `/api/auth/password/forgot` | `{ email }` → always 202; emails a reset link when the account exists              |
| POST   | `/api/auth/password/reset`  | `{ token, password }` → sets the password, revokes all sessions                    |
| POST   | `/api/auth/password/change` | `{ currentPassword, newPassword }` (authenticated)                                 |

### Public content

| Method | Path                               | Description                                                                                                  |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/public/site`                 | Profile summary, social links, navigation, public settings, route SEO                                        |
| GET    | `/api/public/home`                 | Everything the home page needs in one request                                                                |
| GET    | `/api/public/about`                | Profile narrative, education, skills tree, credential summary                                                |
| GET    | `/api/public/experience`           | Visible experience entries (current first) + education timeline data                                         |
| GET    | `/api/public/projects`             | Search/filter/sort: `q, category, tech, year, type, featured, sort, page` → items + facets                   |
| GET    | `/api/public/projects/:slug`       | Case study with sections, metrics, media, related work                                                       |
| GET    | `/api/public/research`             | Research works, presentations, publication count                                                             |
| GET    | `/api/public/research/:slug`       | Research detail                                                                                              |
| GET    | `/api/public/publications`         | Publications with citation data                                                                              |
| GET    | `/api/public/certifications`       | Provider → credential tree                                                                                   |
| GET    | `/api/public/certifications/:slug` | Credential detail with children and skills                                                                   |
| GET    | `/api/public/blog`                 | Posts: `q, category, tag, page`                                                                              |
| GET    | `/api/public/blog/:slug`           | Post detail                                                                                                  |
| GET    | `/api/public/github`               | Curated repositories from the local cache                                                                    |
| GET    | `/api/public/search?q=`            | Full-text search across projects, research, publications, posts, credentials                                 |
| GET    | `/api/public/sitemap`              | Slugs and `updatedAt` for sitemap generation                                                                 |
| GET    | `/api/public/contact/token`        | Signed form token (spam timing check)                                                                        |
| POST   | `/api/public/contact`              | `{ name, email, subject, message, token, website }` → stores message, notifies admin (5/hour, 20/day per IP) |

### Analytics ingestion

| Method | Path                    | Description                                                                                                                         |
| ------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/analytics/events` | `{ type, path, referrer?, target? }` → 204; ignored for DNT/GPC, bots, admin/preview paths or when analytics is off (60/min per IP) |

### Admin

All routes require a session. The permission required is listed; see
`authorization.md` for the role matrix.

| Area          | Routes                                                                                                                                                                 | Permission                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Dashboard     | `GET /api/admin/dashboard`                                                                                                                                             | `content:read`                                                                  |
| Search        | `GET /api/admin/search?q=`                                                                                                                                             | `content:read`                                                                  |
| Options       | `GET /api/admin/options?types=projects,skills,…` (id/label lists for pickers)                                                                                          | `content:read`                                                                  |
| Profile       | `GET, PUT /api/admin/profile`                                                                                                                                          | read / `content:write`                                                          |
| Collections   | `GET, POST /api/admin/{resource}`; `GET, PUT, DELETE /api/admin/{resource}/:id`; `POST /api/admin/{resource}/reorder`; `POST /api/admin/{resource}/bulk`               | read / write / delete (bulk: `content:publish`, or `content:delete` for delete) |
| Status        | `POST /api/admin/{resource}/:id/status` `{ status }` (projects, research, publications, presentations, blog posts)                                                     | `content:publish`                                                               |
| Preview       | `GET /api/admin/preview/{projects,research,blog-posts}/:id`                                                                                                            | `content:read`                                                                  |
| Media         | `GET, POST /api/admin/media`, `GET, PATCH, DELETE /api/admin/media/:id`, `POST /api/admin/media/:id/replace`                                                           | `media:manage`                                                                  |
| Messages      | `GET /api/admin/messages`, `GET, PATCH, DELETE /api/admin/messages/:id`, `POST /api/admin/messages/bulk`                                                               | `messages:manage`                                                               |
| Settings      | `GET, PUT /api/admin/settings`; `GET /api/admin/seo`; `PUT /api/admin/seo/:routeKey`                                                                                   | `settings:manage`                                                               |
| Users & roles | `GET, POST /api/admin/users`, `PUT, DELETE /api/admin/users/:id`, `POST /api/admin/users/:id/unlock`; `GET, POST /api/admin/roles`, `PUT, DELETE /api/admin/roles/:id` | `users:manage`                                                                  |
| Sessions      | `GET /api/admin/sessions`, `DELETE /api/admin/sessions/:id`                                                                                                            | own sessions; all with `users:manage`                                           |
| Audit log     | `GET /api/admin/audit-logs`                                                                                                                                            | `audit:read`                                                                    |
| Analytics     | `GET /api/admin/analytics/summary?days=`                                                                                                                               | `analytics:read`                                                                |
| Integrations  | `GET /api/admin/integrations/github`, `POST …/sync`, `PATCH …/repositories/:id`                                                                                        | `integrations:manage`                                                           |
| System        | `GET /api/admin/system`                                                                                                                                                | `system:read`                                                                   |

`{resource}` is one of: `social-links`, `focus-areas`, `approach-steps`,
`navigation`, `experiences`, `education`, `project-categories`, `tags`,
`projects`, `research`, `publications`, `presentations`, `skill-categories`,
`skills`, `credential-providers`, `credential-types`, `credentials`,
`blog-categories`, `blog-posts`.

Bulk actions are `publish`, `unpublish`, `archive`, `feature`, `unfeature`,
`show`, `hide` and `delete`, each accepted only where the resource has the
matching field. The response is `{ succeeded: string[], failed: { id, message }[] }`
so partial failures (for example a category still in use) are reported per
item. Saving a record that would change `status`, `featured`, `visibility` or
`isVisible` also requires `content:publish`: an editor without it can create
and edit drafts only.

Every successful admin mutation writes an `audit_logs` row and asks the web
app to revalidate its cached content (see `architecture.md` §3).

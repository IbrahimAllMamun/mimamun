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
| `ACCOUNT_LOCKED`         | 423  | Temporary lockout after repeated failed logins                     |
| `RATE_LIMITED`           | 429  | Too many requests (`Retry-After` header set)                       |
| `INTERNAL_ERROR`         | 500  | Unexpected error (logged with request id; no stack trace returned) |
| `SERVICE_UNAVAILABLE`    | 503  | Database unavailable                                               |

Every response carries `X-Request-Id`; include it when reporting problems.

### Lists

List endpoints accept `page` (1-based), `pageSize` (≤ 100), `sort`
(`field` or `-field`) and resource-specific filters, and return
`meta: { page, pageSize, total, totalPages }` plus `facets` where useful.

### Writes

- Content type `application/json` (uploads use `multipart/form-data`).
- State-changing admin requests require the session cookie **and**
  `X-CSRF-Token` (value from `GET /api/auth/session`); requests whose `Origin`
  header is not the site origin are rejected.
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

| Method | Path                               | Description                                                                                |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/api/public/site`                 | Profile summary, social links, navigation, public settings, route SEO                      |
| GET    | `/api/public/home`                 | Everything the home page needs in one request                                              |
| GET    | `/api/public/about`                | Profile narrative, education, skills tree, credential summary                              |
| GET    | `/api/public/experience`           | Visible experience entries (current first) + education timeline data                       |
| GET    | `/api/public/projects`             | Search/filter/sort: `q, category, tech, year, type, featured, sort, page` → items + facets |
| GET    | `/api/public/projects/:slug`       | Case study with sections, metrics, media, related work                                     |
| GET    | `/api/public/research`             | Research works, presentations, publication count                                           |
| GET    | `/api/public/research/:slug`       | Research detail                                                                            |
| GET    | `/api/public/publications`         | Publications with citation data                                                            |
| GET    | `/api/public/certifications`       | Provider → credential tree                                                                 |
| GET    | `/api/public/certifications/:slug` | Credential detail with children and skills                                                 |
| GET    | `/api/public/blog`                 | Posts: `q, category, tag, page`                                                            |
| GET    | `/api/public/blog/:slug`           | Post detail                                                                                |
| GET    | `/api/public/github`               | Curated repositories from the local cache                                                  |
| GET    | `/api/public/search?q=`            | Full-text search across projects, research, publications, posts, credentials               |
| GET    | `/api/public/sitemap`              | Slugs and `updatedAt` for sitemap generation                                               |
| GET    | `/api/public/contact/token`        | Signed form token (spam timing check)                                                      |
| POST   | `/api/public/contact`              | `{ name, email, subject, message, token, website }` → stores message, notifies admin       |

### Analytics ingestion

| Method | Path                    | Description                                                                                         |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------------- |
| POST   | `/api/analytics/events` | `{ type, path, referrer?, entity?, target? }`; ignored when DNT/GPC is set or analytics is disabled |

### Admin

All routes require a session. The permission required is listed; see
`authorization.md` for the role matrix.

| Area          | Routes                                                                                                                                                   | Permission                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Dashboard     | `GET /api/admin/dashboard`                                                                                                                               | `content:read`                        |
| Search        | `GET /api/admin/search?q=`                                                                                                                               | `content:read`                        |
| Options       | `GET /api/admin/options?types=projects,skills,…` (id/label lists for pickers)                                                                            | `content:read`                        |
| Profile       | `GET, PUT /api/admin/profile`                                                                                                                            | read / `content:write`                |
| Collections   | `GET, POST /api/admin/{resource}`; `GET, PUT, DELETE /api/admin/{resource}/:id`; `POST /api/admin/{resource}/reorder`; `POST /api/admin/{resource}/bulk` | read / write / delete                 |
| Status        | `POST /api/admin/{resource}/:id/status` `{ status }`                                                                                                     | `content:publish`                     |
| Preview       | `GET /api/admin/preview/{projects,research,publications,blog}/:id`                                                                                       | `content:read`                        |
| Media         | `GET, POST /api/admin/media`, `GET, PATCH, DELETE /api/admin/media/:id`, `POST /api/admin/media/:id/replace`                                             | `media:manage`                        |
| Messages      | `GET /api/admin/messages`, `GET, PATCH, DELETE /api/admin/messages/:id`, `POST /api/admin/messages/bulk`                                                 | `messages:manage`                     |
| Settings      | `GET, PUT /api/admin/settings`; `GET, PUT /api/admin/seo/:routeKey`                                                                                      | `settings:manage`                     |
| Users & roles | `/api/admin/users…`, `/api/admin/roles…`                                                                                                                 | `users:manage`                        |
| Sessions      | `GET /api/admin/sessions`, `DELETE /api/admin/sessions/:id`                                                                                              | own sessions; all with `users:manage` |
| Audit log     | `GET /api/admin/audit-logs`                                                                                                                              | `audit:read`                          |
| Analytics     | `GET /api/admin/analytics/summary?days=`                                                                                                                 | `analytics:read`                      |
| Integrations  | `GET /api/admin/integrations/github`, `POST …/sync`, `PATCH …/repositories/:id`                                                                          | `integrations:manage`                 |
| System        | `GET /api/admin/system`                                                                                                                                  | `system:read`                         |

`{resource}` is one of: `social-links`, `focus-areas`, `approach-steps`,
`navigation`, `experiences`, `education`, `project-categories`, `tags`,
`projects`, `research`, `publications`, `presentations`, `skill-categories`,
`skills`, `credential-providers`, `credential-types`, `credentials`,
`blog-categories`, `blog-posts`.

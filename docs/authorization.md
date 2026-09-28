# Authorization

Role-based access control, enforced by the API on every admin request. The
Next.js admin hides what a user cannot do, but it is never the security
boundary. Code: `packages/shared/src/permissions.ts`,
`apps/api/src/middleware/auth.ts`, `apps/api/src/lib/resource.ts`,
`apps/api/src/modules/users`.

## Model

- **Permissions** are fixed keys defined in code.
- **Roles** are data: rows in `roles` with their permissions in
  `role_permissions`. Administrators can create roles and change what they
  grant without a deploy.
- **Users** have exactly one role.

Permissions are loaded together with the session on every request, so a
change to a role applies to its users immediately.

### Permissions

| Key                   | Grants                                                         |
| --------------------- | -------------------------------------------------------------- |
| `content:read`        | See all content in the admin, including drafts, and preview it |
| `content:write`       | Create and edit content                                        |
| `content:publish`     | Publish, archive, feature and hide content                     |
| `content:delete`      | Permanently delete content                                     |
| `media:manage`        | Upload, edit, replace and delete media                         |
| `messages:manage`     | Read and manage contact messages                               |
| `analytics:read`      | View visitor analytics                                         |
| `settings:manage`     | Change site settings and SEO defaults                          |
| `users:manage`        | Manage users, roles and everyone's sessions                    |
| `audit:read`          | Read the audit log                                             |
| `system:read`         | View system status                                             |
| `integrations:manage` | Configure and run integrations (GitHub)                        |

### Built-in roles

Created by the seed; marked `is_system`.

| Permission            | Administrator (`ADMIN`) | Editor (`EDITOR`) |
| --------------------- | :---------------------: | :---------------: |
| `content:read`        |            ✓            |         ✓         |
| `content:write`       |            ✓            |         ✓         |
| `content:publish`     |            ✓            |         ✓         |
| `content:delete`      |            ✓            |                   |
| `media:manage`        |            ✓            |         ✓         |
| `messages:manage`     |            ✓            |                   |
| `analytics:read`      |            ✓            |         ✓         |
| `settings:manage`     |            ✓            |                   |
| `users:manage`        |            ✓            |                   |
| `audit:read`          |            ✓            |                   |
| `system:read`         |            ✓            |                   |
| `integrations:manage` |            ✓            |                   |

A custom role — for example a reviewer with `content:read` only, or a writer
with `content:read` + `content:write` but no `content:publish` — is created
under **Admin → Roles**.

## Enforcement

- Every route under `/api/admin` requires a valid session
  (`requireAuth`), then `requirePermission(...)` for the specific action.
- The generic content routes (`apps/api/src/lib/resource.ts`) map actions to
  permissions: list/read → `content:read`, create/update/reorder →
  `content:write`, delete → `content:delete`, status change →
  `content:publish`. Bulk actions need `content:publish`, or
  `content:delete` for bulk delete.
- **Publishing guard**: creating or saving a record that would change
  `status`, `featured`, `visibility` or `isVisible` also needs
  `content:publish`. A user without it can create and edit drafts, but the
  API refuses to publish, feature or hide anything through the edit form
  too, not only through the status endpoint.
- Media, messages, analytics, settings/SEO, users/roles, the audit log,
  system status and integrations each check their own permission (see the
  admin table in `api.md`).
- Previews of unpublished content (`/api/admin/preview/*`) need
  `content:read`.
- Sessions: everyone can list and revoke their own sessions; `users:manage`
  can see and revoke everyone's.
- Denied requests answer `403 FORBIDDEN`; requests without a session answer
  `401 UNAUTHENTICATED`.

## Safeguards against lock-out

- At least one **active** user must hold `users:manage`. Disabling a user,
  moving them to another role, or editing a role in a way that would leave no
  such user is refused with `409 CONFLICT`.
- The Administrator role keeps its key and the `users:manage` permission.
- System roles cannot be deleted; a custom role can be deleted only after its
  users are moved to another role.
- Users cannot delete their own account.
- Disabling a user or changing their role revokes all of their sessions.

## In the admin UI

The sidebar (`apps/web/src/components/admin/navigation.ts`) lists each screen
with the permission it needs and hides the ones the user lacks. Editors see
publish, delete and bulk controls only when they hold the matching
permission. These are conveniences: the API applies the same rules.

## Tests

`apps/api/test/integration/authorization.test.ts` exercises these rules
against a real database: anonymous access to every admin area, what the
Editor role may and may not do, a custom role without `content:publish`, the
last-user-manager safeguard, session revocation when a user is disabled, and
the CSRF token requirement.

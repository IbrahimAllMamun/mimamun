/**
 * Permission keys are defined in code; roles (and which permissions they grant)
 * are data stored in PostgreSQL, so new roles can be created without a deploy.
 */
export const PERMISSIONS = {
  CONTENT_READ: "content:read",
  CONTENT_WRITE: "content:write",
  CONTENT_PUBLISH: "content:publish",
  CONTENT_DELETE: "content:delete",
  MEDIA_MANAGE: "media:manage",
  MESSAGES_MANAGE: "messages:manage",
  ANALYTICS_READ: "analytics:read",
  SETTINGS_MANAGE: "settings:manage",
  USERS_MANAGE: "users:manage",
  AUDIT_READ: "audit:read",
  SYSTEM_READ: "system:read",
  INTEGRATIONS_MANAGE: "integrations:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS);

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  "content:read": "View all content in the admin, including drafts, and preview it",
  "content:write": "Create and edit content",
  "content:publish": "Publish, archive, feature and hide content",
  "content:delete": "Permanently delete content",
  "media:manage": "Upload, edit, replace and delete media",
  "messages:manage": "Read and manage contact messages",
  "analytics:read": "View visitor analytics",
  "settings:manage": "Change site settings, navigation and SEO defaults",
  "users:manage": "Manage users, roles and sessions",
  "audit:read": "Read the audit log",
  "system:read": "View system status",
  "integrations:manage": "Configure and run integrations (GitHub)",
};

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}

/** Built-in roles created by the seed. ADMIN is a protected system role. */
export const SYSTEM_ROLES = {
  ADMIN: {
    key: "ADMIN",
    name: "Administrator",
    description: "Full access, including users, roles, settings and the audit log.",
    permissions: ALL_PERMISSIONS,
  },
  EDITOR: {
    key: "EDITOR",
    name: "Editor",
    description: "Writes, publishes and organises content and media.",
    permissions: [
      PERMISSIONS.CONTENT_READ,
      PERMISSIONS.CONTENT_WRITE,
      PERMISSIONS.CONTENT_PUBLISH,
      PERMISSIONS.MEDIA_MANAGE,
      PERMISSIONS.ANALYTICS_READ,
    ],
  },
} as const satisfies Record<
  string,
  { key: string; name: string; description: string; permissions: readonly Permission[] }
>;

export function hasPermission(granted: readonly string[], required: Permission): boolean {
  return granted.includes(required);
}

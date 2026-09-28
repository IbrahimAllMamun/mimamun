import { asc, eq, sql } from "drizzle-orm";
import {
  credentialInput,
  credentialProviderInput,
  credentialTypeInput,
  formatMonth,
  type CredentialInput,
} from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import { credentialProviders, credentials, credentialSkills, credentialTypes } from "../../database/schema";
import { loadLinks, syncLinks } from "../../lib/content";
import { badRequest, conflict } from "../../lib/errors";
import { assertMediaExists } from "../../lib/media-refs";
import { defineResource, listItem, UUID_PATTERN } from "../../lib/resource";

export const credentialProviderResource = defineResource({
  path: "credential-providers",
  entityType: "credential_provider",
  label: "Credential provider",
  table: credentialProviders,
  input: credentialProviderInput,
  slugSource: "name",
  searchColumns: ["name", "description"],
  defaultSort: [asc(credentialProviders.displayOrder), asc(credentialProviders.name)],
  listItem: (row) => listItem(row, { title: String(row.name), subtitle: (row.websiteUrl as string | null) ?? null }),
  validate: async (db, input) => {
    await assertMediaExists(db, [{ id: input.logoMediaId, kind: "image", path: "logoMediaId" }]);
  },
  beforeDelete: async (db, row) => {
    const [child] = await db.select({ id: credentials.id }).from(credentials).where(eq(credentials.providerId, row.id)).limit(1);
    if (child) throw conflict("Delete or move this provider's credentials first");
  },
});

export const credentialTypeResource = defineResource({
  path: "credential-types",
  entityType: "credential_type",
  label: "Credential type",
  table: credentialTypes,
  input: credentialTypeInput,
  slugSource: "name",
  searchColumns: ["name"],
  defaultSort: [asc(credentialTypes.displayOrder), asc(credentialTypes.name)],
  listItem: (row) => listItem(row, { title: String(row.name), subtitle: (row.description as string | null) ?? null }),
  beforeDelete: async (db, row) => {
    const [used] = await db.select({ id: credentials.id }).from(credentials).where(eq(credentials.typeId, row.id)).limit(1);
    if (used) throw conflict("This type is used by credentials; change their type first");
  },
});

async function assertValidParent(db: DbExecutor, id: string | null, input: CredentialInput) {
  if (!input.parentId) return;
  if (input.parentId === id) {
    throw badRequest("A credential cannot contain itself", [{ path: "parentId", message: "Choose another parent" }]);
  }
  const [parent] = await db
    .select({ providerId: credentials.providerId })
    .from(credentials)
    .where(eq(credentials.id, input.parentId));
  if (!parent) throw badRequest("The parent no longer exists", [{ path: "parentId", message: "Choose another parent" }]);
  if (parent.providerId !== input.providerId) {
    throw badRequest("The parent belongs to a different provider", [
      { path: "parentId", message: "Choose a parent from the same provider" },
    ]);
  }
  if (id) {
    const loop = await db.execute<{ id: string }>(sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id FROM credentials WHERE id = ${input.parentId}
        UNION ALL
        SELECT c.id, c.parent_id FROM credentials c JOIN ancestors a ON c.id = a.parent_id
      )
      SELECT id FROM ancestors WHERE id = ${id} LIMIT 1`);
    if (loop.rows.length) {
      throw badRequest("A credential cannot be placed inside one of its own children", [
        { path: "parentId", message: "This would create a loop" },
      ]);
    }
  }
}

export const credentialResource = defineResource<CredentialInput>({
  path: "credentials",
  entityType: "credential",
  label: "Credential",
  table: credentials,
  input: credentialInput,
  slugSource: "title",
  searchColumns: ["title", "credentialCode", "description"],
  defaultSort: [asc(credentials.providerId), asc(credentials.displayOrder), asc(credentials.title)],
  filters: (query) => (query.parent && UUID_PATTERN.test(query.parent) ? [eq(credentials.providerId, query.parent)] : []),
  relationKeys: ["skillIds"],
  listItem: (row) =>
    listItem(row, {
      title: String(row.title),
      subtitle: formatMonth(row.issuedOn as string | null) || null,
      extra: {
        providerId: String(row.providerId),
        parentId: (row.parentId as string | null) ?? null,
        typeId: String(row.typeId),
      },
    }),
  loadRelations: async (db, ids) => {
    const links = await loadLinks(db, credentialSkills, "credentialId", ids, "skillId");
    return new Map(ids.map((id) => [id, { skillIds: links.get(id) ?? [] }]));
  },
  saveRelations: (tx, id, input) => syncLinks(tx, credentialSkills, "credentialId", id, "skillId", input.skillIds),
  validate: async (db, input, existing) => {
    await assertValidParent(db, existing?.id ?? null, input);
    await assertMediaExists(db, [
      { id: input.imageMediaId, kind: "image", path: "imageMediaId" },
      { id: input.pdfMediaId, kind: "document", path: "pdfMediaId" },
    ]);
  },
  beforeDelete: async (db, row) => {
    const [child] = await db.select({ id: credentials.id }).from(credentials).where(eq(credentials.parentId, row.id)).limit(1);
    if (child) throw conflict("This credential contains other items; move or delete them first");
  },
});

import { Router } from "express";
import { eq, isNotNull } from "drizzle-orm";
import {
  PERMISSIONS,
  profileInput,
  seoFieldsInput,
  siteSettingsInput,
  STATIC_ROUTE_KEYS,
  type StaticRouteKey,
} from "@portfolio/shared";
import { profile, seoMetadata, siteSettings } from "../../database/schema";
import { requirePermission } from "../../middleware/auth";
import { notFound } from "../../lib/errors";
import { ok, parse } from "../../lib/http";
import { assertMediaExists } from "../../lib/media-refs";
import type { AppDeps } from "../../types";
import { recordAudit } from "../audit/service";

function profileRecord(row: typeof profile.$inferSelect) {
  const { id: _id, ...rest } = row;
  return rest;
}

function settingsRecord(row: typeof siteSettings.$inferSelect) {
  const { id: _id, ...rest } = row;
  return rest;
}

export function siteAdminRouter(deps: AppDeps): Router {
  const router = Router();
  const { db } = deps;

  router.get("/profile", requirePermission(PERMISSIONS.CONTENT_READ), async (_req, res) => {
    const [row] = await db.select().from(profile).where(eq(profile.id, 1));
    if (!row) throw notFound("Profile");
    ok(res, profileRecord(row));
  });

  router.put("/profile", requirePermission(PERMISSIONS.CONTENT_WRITE), async (req, res) => {
    const input = parse(profileInput, req.body);
    await assertMediaExists(db, [
      { id: input.avatarMediaId, kind: "image", path: "avatarMediaId" },
      { id: input.cvMediaId, kind: "document", path: "cvMediaId" },
    ]);
    const updated = await db.transaction(async (tx) => {
      const [before] = await tx.select().from(profile).where(eq(profile.id, 1));
      const [row] = await tx
        .insert(profile)
        .values({ id: 1, ...input })
        .onConflictDoUpdate({ target: profile.id, set: input })
        .returning();
      await recordAudit(tx, req, {
        action: "profile.update",
        entityType: "profile",
        entityId: "1",
        summary: "Updated profile",
        before: before ? profileRecord(before) : null,
        after: row ? profileRecord(row) : null,
      });
      return row!;
    });
    deps.revalidator.contentChanged("profile:update");
    ok(res, profileRecord(updated));
  });

  router.get("/settings", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (_req, res) => {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
    if (!row) throw notFound("Settings");
    ok(res, settingsRecord(row));
  });

  router.put("/settings", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    const input = parse(siteSettingsInput, req.body);
    await assertMediaExists(db, [
      { id: input.defaultOgImageId, kind: "image", path: "defaultOgImageId" },
    ]);
    const updated = await db.transaction(async (tx) => {
      const [before] = await tx.select().from(siteSettings).where(eq(siteSettings.id, 1));
      const [row] = await tx
        .insert(siteSettings)
        .values({ id: 1, ...input })
        .onConflictDoUpdate({ target: siteSettings.id, set: input })
        .returning();
      await recordAudit(tx, req, {
        action: "settings.update",
        entityType: "settings",
        entityId: "1",
        summary: "Updated site settings",
        before: before ? settingsRecord(before) : null,
        after: row ? settingsRecord(row) : null,
      });
      return row!;
    });
    deps.revalidator.contentChanged("settings:update");
    ok(res, settingsRecord(updated));
  });

  router.get("/seo", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (_req, res) => {
    const rows = await db.select().from(seoMetadata).where(isNotNull(seoMetadata.routeKey));
    const byKey = new Map(rows.map((row) => [row.routeKey, row]));
    ok(
      res,
      STATIC_ROUTE_KEYS.map((key) => {
        const row = byKey.get(key);
        return {
          routeKey: key,
          title: row?.title ?? null,
          description: row?.description ?? null,
          canonicalUrl: row?.canonicalUrl ?? null,
          ogImageId: row?.ogImageId ?? null,
          noindex: row?.noindex ?? false,
          updatedAt: row?.updatedAt ?? null,
        };
      }),
    );
  });

  router.put("/seo/:routeKey", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    const routeKey = String(req.params.routeKey);
    if (!(STATIC_ROUTE_KEYS as readonly string[]).includes(routeKey)) throw notFound("Page");
    const input = parse(seoFieldsInput, req.body);
    await assertMediaExists(db, [{ id: input.ogImageId, kind: "image", path: "ogImageId" }]);
    const row = await db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(seoMetadata)
        .where(eq(seoMetadata.routeKey, routeKey));
      const [saved] = await tx
        .insert(seoMetadata)
        .values({ routeKey, ...input })
        .onConflictDoUpdate({ target: seoMetadata.routeKey, set: input })
        .returning();
      await recordAudit(tx, req, {
        action: "seo.update",
        entityType: "seo",
        entityId: routeKey,
        summary: `Updated SEO for ${routeKey as StaticRouteKey}`,
        before: before ?? null,
        after: saved ?? null,
      });
      return saved!;
    });
    deps.revalidator.contentChanged("seo:update");
    ok(res, row);
  });

  return router;
}

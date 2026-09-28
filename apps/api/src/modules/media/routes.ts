import { Router } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import {
  mediaListQuery,
  mediaUpdateInput,
  nullableText,
  pageMeta,
  PERMISSIONS,
} from "@portfolio/shared";
import { z } from "zod";
import { media, users } from "../../database/schema";
import { requirePermission } from "../../middleware/auth";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { created, noContent, ok, parse } from "../../lib/http";
import { UUID_PATTERN } from "../../lib/resource";
import type { AppDeps } from "../../types";
import { recordAudit } from "../audit/service";
import { toAdminMediaDTO } from "./mapper";
import { findMediaUsage, listMedia, metadataValues, newStorageKey, processUpload } from "./service";

const uploadFields = z.object({
  title: nullableText(200, "Title"),
  altText: nullableText(300, "Alt text"),
  caption: nullableText(500, "Caption"),
});

export function mediaRouter(deps: AppDeps): Router {
  const router = Router();
  const { db, storage, config } = deps;
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: Math.max(
        config.uploads.maxImageBytes,
        config.uploads.maxDocumentBytes,
        config.uploads.maxVideoBytes,
      ),
      files: 1,
      fields: 10,
      fieldSize: 2000,
      parts: 12,
    },
  }).single("file");

  router.use(requirePermission(PERMISSIONS.MEDIA_MANAGE));
  router.param("id", (_req, _res, next, value: string) =>
    next(UUID_PATTERN.test(value) ? undefined : notFound("File")),
  );

  router.get("/", async (req, res) => {
    const query = parse(mediaListQuery, req.query);
    const { items, total } = await listMedia(db, query);
    ok(res, items, pageMeta(query.page, query.pageSize, total));
  });

  router.post("/", upload, async (req, res) => {
    if (!req.file)
      throw badRequest("Choose a file to upload", [{ path: "file", message: "Required" }]);
    const fields = parse(uploadFields, req.body ?? {});
    const processed = await processUpload(req.file, config.uploads);
    const storageKey = newStorageKey(processed.type.ext);
    await storage.put(storageKey, processed.body);
    try {
      const row = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(media)
          .values({
            storageKey,
            originalName: processed.originalName,
            mimeType: processed.type.mime,
            kind: processed.type.kind,
            sizeBytes: processed.body.length,
            width: processed.width,
            height: processed.height,
            checksumSha256: processed.checksum,
            ...fields,
            uploadedBy: req.auth?.user.id ?? null,
          })
          .returning();
        if (!inserted) throw new Error("Insert failed");
        await recordAudit(tx, req, {
          action: "media.upload",
          entityType: "media",
          entityId: inserted.id,
          summary: `Uploaded ${inserted.originalName}`,
          after: {
            originalName: inserted.originalName,
            mimeType: inserted.mimeType,
            sizeBytes: inserted.sizeBytes,
          },
        });
        return inserted;
      });
      created(res, toAdminMediaDTO(row, req.auth?.user.name ?? null));
    } catch (error) {
      await storage.remove(storageKey);
      throw error;
    }
  });

  router.get("/:id", async (req, res) => {
    const [row] = await db
      .select({ media, uploader: users.name })
      .from(media)
      .leftJoin(users, eq(users.id, media.uploadedBy))
      .where(eq(media.id, String(req.params.id)));
    if (!row) throw notFound("File");
    ok(res, {
      ...toAdminMediaDTO(row.media, row.uploader),
      usage: await findMediaUsage(db, row.media.id),
    });
  });

  router.patch("/:id", async (req, res) => {
    const input = parse(mediaUpdateInput, req.body);
    const id = String(req.params.id);
    const row = await db.transaction(async (tx) => {
      const [before] = await tx.select().from(media).where(eq(media.id, id));
      if (!before) throw notFound("File");
      const [updated] = await tx
        .update(media)
        .set(metadataValues(input))
        .where(eq(media.id, id))
        .returning();
      await recordAudit(tx, req, {
        action: "media.update",
        entityType: "media",
        entityId: id,
        summary: `Updated details of ${before.originalName}`,
        before: metadataValues({
          title: before.title,
          altText: before.altText,
          caption: before.caption,
        }),
        after: metadataValues(input),
      });
      return updated!;
    });
    deps.revalidator.contentChanged("media:update");
    ok(res, toAdminMediaDTO(row));
  });

  /** Replaces the file but keeps the id, so every reference picks up the new file. */
  router.post("/:id/replace", upload, async (req, res) => {
    if (!req.file)
      throw badRequest("Choose a file to upload", [{ path: "file", message: "Required" }]);
    const id = String(req.params.id);
    const [existing] = await db.select().from(media).where(eq(media.id, id));
    if (!existing) throw notFound("File");
    const processed = await processUpload(req.file, config.uploads, existing.kind);
    const storageKey = newStorageKey(processed.type.ext);
    await storage.put(storageKey, processed.body);
    let row;
    try {
      row = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(media)
          .set({
            storageKey,
            originalName: processed.originalName,
            mimeType: processed.type.mime,
            sizeBytes: processed.body.length,
            width: processed.width,
            height: processed.height,
            checksumSha256: processed.checksum,
          })
          .where(eq(media.id, id))
          .returning();
        await recordAudit(tx, req, {
          action: "media.replace",
          entityType: "media",
          entityId: id,
          summary: `Replaced ${existing.originalName} with ${processed.originalName}`,
          before: { originalName: existing.originalName, sizeBytes: existing.sizeBytes },
          after: { originalName: processed.originalName, sizeBytes: processed.body.length },
        });
        return updated!;
      });
    } catch (error) {
      await storage.remove(storageKey);
      throw error;
    }
    await storage.remove(existing.storageKey);
    deps.revalidator.contentChanged("media:replace");
    ok(res, toAdminMediaDTO(row));
  });

  router.delete("/:id", async (req, res) => {
    const id = String(req.params.id);
    const [existing] = await db.select().from(media).where(eq(media.id, id));
    if (!existing) throw notFound("File");
    const usage = await findMediaUsage(db, id);
    if (usage.length) {
      throw conflict(
        "This file is in use. Remove it from the content below before deleting it.",
        usage.map((item) => ({ path: item.entityType, message: `${item.field} — ${item.label}` })),
      );
    }
    await db.transaction(async (tx) => {
      await tx.delete(media).where(eq(media.id, id));
      await recordAudit(tx, req, {
        action: "media.delete",
        entityType: "media",
        entityId: id,
        summary: `Deleted ${existing.originalName}`,
        before: { originalName: existing.originalName, storageKey: existing.storageKey },
      });
    });
    await storage.remove(existing.storageKey);
    noContent(res);
  });

  return router;
}

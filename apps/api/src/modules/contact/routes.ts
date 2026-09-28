import { Router } from "express";
import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import {
  contactBulkInput,
  contactInput,
  contactListQuery,
  contactUpdateInput,
  pageMeta,
  PERMISSIONS,
  type ContactMessageDTO,
} from "@portfolio/shared";
import { contactMessages, siteSettings } from "../../database/schema";
import { requirePermission } from "../../middleware/auth";
import { createRateLimit, minutes } from "../../middleware/rate-limit";
import { likeTerm } from "../../lib/content";
import { hmacHex, signTimestamp, verifyTimestamp } from "../../lib/crypto";
import { AppError, notFound } from "../../lib/errors";
import { iso, isoRequired, noContent, ok, parse } from "../../lib/http";
import { UUID_PATTERN } from "../../lib/resource";
import type { AppDeps } from "../../types";
import { recordAudit } from "../audit/service";

const TOKEN_PURPOSE = "contact-form";
const URL_PATTERN = /https?:\/\/|www\./gi;

function toDTO(row: typeof contactMessages.$inferSelect): ContactMessageDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    notifiedAt: iso(row.notifiedAt),
    readAt: iso(row.readAt),
    createdAt: isoRequired(row.createdAt),
  };
}

/** Public contact endpoints: token issuance and submission. */
export function contactPublicRouter(deps: AppDeps): Router {
  const router = Router();
  const { db, config, mailer, logger } = deps;
  const perHour = createRateLimit({
    windowMs: minutes(60),
    limit: 5,
    message: "You have sent several messages recently. Please try again later or email directly.",
  });
  const perDay = createRateLimit({
    windowMs: minutes(24 * 60),
    limit: 20,
    message: "Daily message limit reached. Please try again tomorrow or email directly.",
  });

  router.get("/contact/token", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    ok(res, { token: signTimestamp(config.appSecret, TOKEN_PURPOSE) });
  });

  router.post("/contact", perHour, perDay, async (req, res) => {
    const [settings] = await db
      .select({
        enabled: siteSettings.contactFormEnabled,
        notifyEmail: siteSettings.contactNotificationEmail,
      })
      .from(siteSettings);
    if (settings && !settings.enabled) {
      throw new AppError(
        503,
        "SERVICE_UNAVAILABLE",
        "The contact form is currently closed. Please email directly.",
      );
    }
    const input = parse(contactInput, req.body, "Please check the highlighted fields");
    const accepted = { message: "Thank you — your message has been sent." };

    // Honeypot filled: a bot. Respond as if it worked and store nothing.
    if (input.website.trim() !== "") {
      logger.info({ requestId: req.id }, "contact honeypot triggered");
      res.status(201).json({ success: true, data: accepted });
      return;
    }
    const timing = verifyTimestamp(config.appSecret, TOKEN_PURPOSE, input.token, {
      minAgeMs: config.isTest ? 0 : 3000,
      maxAgeMs: 24 * 60 * 60 * 1000,
    });
    const linkCount = (input.message.match(URL_PATTERN) ?? []).length;
    const suspicious = timing !== "valid" || linkCount > 5;

    const [row] = await db
      .insert(contactMessages)
      .values({
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        status: suspicious ? "spam" : "new",
        ipHash: req.ip ? hmacHex(config.appSecret, req.ip) : null,
      })
      .returning();

    if (row && !suspicious) {
      const to = settings?.notifyEmail;
      if (to) {
        const sent = await mailer.send({
          to,
          replyTo: input.email,
          subject: `Portfolio contact: ${input.subject}`.slice(0, 200),
          text: `New message from ${input.name} <${input.email}>\n\nSubject: ${input.subject}\n\n${input.message}\n\n— Sent from the contact form. Manage messages in the admin: ${config.appUrl}/admin/messages/${row.id}\n`,
        });
        if (sent)
          await db
            .update(contactMessages)
            .set({ notifiedAt: new Date() })
            .where(eq(contactMessages.id, row.id));
      }
    }
    res.status(201).json({ success: true, data: accepted });
  });

  return router;
}

export function contactAdminRouter(deps: AppDeps): Router {
  const router = Router();
  const { db } = deps;
  router.use(requirePermission(PERMISSIONS.MESSAGES_MANAGE));
  router.param("id", (_req, _res, next, value: string) =>
    next(UUID_PATTERN.test(value) ? undefined : notFound("Message")),
  );

  router.get("/", async (req, res) => {
    const query = parse(contactListQuery, req.query);
    const filters: SQL[] = [];
    if (query.status) filters.push(eq(contactMessages.status, query.status));
    if (query.q) {
      const term = likeTerm(query.q);
      const search = or(
        ilike(contactMessages.name, term),
        ilike(contactMessages.email, term),
        ilike(contactMessages.subject, term),
        ilike(contactMessages.message, term),
      );
      if (search) filters.push(search);
    }
    const where = filters.length ? and(...filters) : undefined;
    const [rows, [total]] = await Promise.all([
      db
        .select()
        .from(contactMessages)
        .where(where)
        .orderBy(desc(contactMessages.createdAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(contactMessages).where(where),
    ]);
    ok(res, rows.map(toDTO), pageMeta(query.page, query.pageSize, total?.value ?? 0));
  });

  router.get("/:id", async (req, res) => {
    const id = String(req.params.id);
    const [row] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    if (!row) throw notFound("Message");
    if (row.status === "new") {
      const [updated] = await db
        .update(contactMessages)
        .set({ status: "read", readAt: new Date() })
        .where(eq(contactMessages.id, id))
        .returning();
      ok(res, toDTO(updated ?? row));
      return;
    }
    ok(res, toDTO(row));
  });

  router.patch("/:id", async (req, res) => {
    const input = parse(contactUpdateInput, req.body);
    const id = String(req.params.id);
    const [row] = await db
      .update(contactMessages)
      .set({
        status: input.status,
        ...(input.status === "replied" ? { repliedAt: new Date() } : {}),
        ...(input.status !== "new" ? {} : { readAt: null }),
      })
      .where(eq(contactMessages.id, id))
      .returning();
    if (!row) throw notFound("Message");
    await recordAudit(db, req, {
      action: "message.status",
      entityType: "message",
      entityId: id,
      summary: `Marked message from ${row.email} as ${input.status}`,
    });
    ok(res, toDTO(row));
  });

  router.delete("/:id", async (req, res) => {
    const id = String(req.params.id);
    const [row] = await db.delete(contactMessages).where(eq(contactMessages.id, id)).returning();
    if (!row) throw notFound("Message");
    await recordAudit(db, req, {
      action: "message.delete",
      entityType: "message",
      entityId: id,
      summary: `Deleted message from ${row.email}`,
    });
    noContent(res);
  });

  router.post("/bulk", async (req, res) => {
    const input = parse(contactBulkInput, req.body);
    let affected = 0;
    if (input.action === "delete") {
      affected = (
        await db
          .delete(contactMessages)
          .where(inArray(contactMessages.id, input.ids))
          .returning({ id: contactMessages.id })
      ).length;
    } else {
      const status =
        input.action === "read" ? "read" : input.action === "archive" ? "archived" : "spam";
      affected = (
        await db
          .update(contactMessages)
          .set({ status, ...(status === "read" ? { readAt: new Date() } : {}) })
          .where(inArray(contactMessages.id, input.ids))
          .returning({ id: contactMessages.id })
      ).length;
    }
    await recordAudit(db, req, {
      action: `message.bulk_${input.action}`,
      entityType: "message",
      summary: `Bulk ${input.action} on ${affected} messages`,
    });
    ok(res, { affected });
  });

  return router;
}

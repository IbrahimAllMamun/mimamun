import { Router, type Response } from "express";
import { eq } from "drizzle-orm";
import { media } from "../../database/schema";
import { isValidStorageKey } from "../../integrations/storage";
import { notFound } from "../../lib/errors";
import type { AppDeps } from "../../types";

function parseRange(header: string | undefined, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return "invalid";
  const [, rawStart, rawEnd] = match;
  let start: number;
  let end: number;
  if (rawStart === "" && rawEnd) {
    start = Math.max(0, size - Number(rawEnd));
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Math.min(Number(rawEnd), size - 1) : size - 1;
  }
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) return "invalid";
  return { start, end };
}

function contentDisposition(type: "inline" | "attachment", fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/**
 * Public file delivery. Metadata (type, name) comes from the database, never
 * from the path; keys are immutable so responses are cached for a year.
 */
export function mediaFileRouter(deps: Pick<AppDeps, "db" | "storage">): Router {
  const router = Router();

  router.get("/:year/:month/:file", async (req, res: Response) => {
    const key = `${req.params.year}/${req.params.month}/${req.params.file}`;
    if (!isValidStorageKey(key)) throw notFound("File");
    const [row] = await deps.db.select().from(media).where(eq(media.storageKey, key));
    if (!row) throw notFound("File");
    const size = await deps.storage.size(key);
    if (size === null) throw notFound("File");

    const etag = `"${row.checksumSha256}"`;
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    res.setHeader(
      "Content-Disposition",
      contentDisposition(req.query.download === "1" ? "attachment" : "inline", row.originalName),
    );
    // PDFs are left without a CSP because browser PDF viewers are blocked by it;
    // images and video are fully sandboxed.
    if (row.kind !== "document") {
      res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; sandbox");
    } else {
      res.removeHeader("Content-Security-Policy");
    }

    if (req.header("if-none-match") === etag) {
      res.status(304).end();
      return;
    }

    const range = parseRange(req.header("range"), size);
    if (range === "invalid") {
      res.setHeader("Content-Range", `bytes */${size}`);
      res.status(416).end();
      return;
    }
    if (range) {
      res.status(206);
      res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
      res.setHeader("Content-Length", String(range.end - range.start + 1));
    } else {
      res.setHeader("Content-Length", String(size));
    }
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = await deps.storage.read(key, range ?? undefined);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  });

  return router;
}

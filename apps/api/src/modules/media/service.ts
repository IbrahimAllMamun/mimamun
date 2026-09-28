import { createHash, randomUUID } from "node:crypto";
import { count, desc, eq, ilike, or, sql, type SQL, and } from "drizzle-orm";
import sharp from "sharp";
import type { AdminMediaDTO, MediaKind, MediaUsageDTO, MediaUpdateInput } from "@portfolio/shared";
import type { AppConfig } from "../../config/env";
import type { DbExecutor } from "../../database/client";
import { media, users } from "../../database/schema";
import { likeTerm } from "../../lib/content";
import { payloadTooLarge, unsupportedMediaType } from "../../lib/errors";
import { detectFileType, pdfHasActiveContent, sanitizeFileName, type DetectedType } from "./sniff";
import { toAdminMediaDTO } from "./mapper";

/** Longest edge kept for uploaded images; larger images are downscaled. */
const MAX_IMAGE_EDGE = 3200;
/** Rejects decompression bombs before decoding. */
const MAX_INPUT_PIXELS = 60_000_000;

export interface ProcessedUpload {
  body: Buffer;
  type: DetectedType;
  width: number | null;
  height: number | null;
  checksum: string;
  originalName: string;
}

function limitFor(kind: MediaKind, limits: AppConfig["uploads"]): number {
  if (kind === "image") return limits.maxImageBytes;
  if (kind === "video") return limits.maxVideoBytes;
  return limits.maxDocumentBytes;
}

async function reencodeImage(buffer: Buffer, type: DetectedType): Promise<{ body: Buffer; width: number; height: number }> {
  // rotate() applies the EXIF orientation; re-encoding drops all metadata (GPS, camera, author).
  let pipeline = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .rotate()
    .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: "inside", withoutEnlargement: true });
  switch (type.ext) {
    case "jpg":
      pipeline = pipeline.jpeg({ quality: 86, mozjpeg: true });
      break;
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: 86 });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality: 62 });
      break;
    default:
      break;
  }
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { body: data, width: info.width, height: info.height };
}

/** Validates and normalises an uploaded file. Throws 413/415 with a readable message. */
export async function processUpload(
  file: { buffer: Buffer; originalname: string; size: number },
  limits: AppConfig["uploads"],
  expectedKind?: MediaKind,
): Promise<ProcessedUpload> {
  const type = detectFileType(file.buffer);
  if (!type) {
    throw unsupportedMediaType("Unsupported file type. Upload JPEG, PNG, WebP or AVIF images, PDF documents, or MP4/WebM videos.");
  }
  if (expectedKind && type.kind !== expectedKind) {
    throw unsupportedMediaType(`Replace this file with another ${expectedKind}.`);
  }
  const limit = limitFor(type.kind, limits);
  if (file.size > limit) {
    throw payloadTooLarge(`${type.kind === "document" ? "Documents" : type.kind === "video" ? "Videos" : "Images"} can be at most ${Math.round(limit / 1024 / 1024)} MB.`);
  }
  let body = file.buffer;
  let width: number | null = null;
  let height: number | null = null;
  if (type.kind === "image") {
    try {
      ({ body, width, height } = await reencodeImage(file.buffer, type));
    } catch {
      throw unsupportedMediaType("The image could not be read. It may be corrupted or too large.");
    }
  } else if (type.kind === "document" && pdfHasActiveContent(file.buffer)) {
    throw unsupportedMediaType("PDFs with scripts, attachments or launch actions are not accepted. Export a plain PDF.");
  }
  return {
    body,
    type,
    width,
    height,
    checksum: createHash("sha256").update(body).digest("hex"),
    originalName: sanitizeFileName(file.originalname, type.ext),
  };
}

export function newStorageKey(ext: string, now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}/${month}/${randomUUID()}.${ext}`;
}

export async function listMedia(
  db: DbExecutor,
  query: { q?: string | null; kind?: MediaKind | null; page: number; pageSize: number },
): Promise<{ items: AdminMediaDTO[]; total: number }> {
  const filters: SQL[] = [];
  if (query.kind) filters.push(eq(media.kind, query.kind));
  if (query.q) {
    const term = likeTerm(query.q);
    const search = or(ilike(media.originalName, term), ilike(media.title, term), ilike(media.altText, term));
    if (search) filters.push(search);
  }
  const where = filters.length ? and(...filters) : undefined;
  const [rows, [total]] = await Promise.all([
    db
      .select({ media, uploader: users.name })
      .from(media)
      .leftJoin(users, eq(users.id, media.uploadedBy))
      .where(where)
      .orderBy(desc(media.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ value: count() }).from(media).where(where),
  ]);
  return { items: rows.map((row) => toAdminMediaDTO(row.media, row.uploader)), total: total?.value ?? 0 };
}

export function metadataValues(input: MediaUpdateInput) {
  return { title: input.title, altText: input.altText, caption: input.caption };
}

interface UsageSource {
  table: string;
  column: string;
  entityType: string;
  labelSql: string;
  href: (id: string) => string | null;
  field: string;
  json?: boolean;
}

/** Everywhere a media file can be referenced (foreign keys and JSON content blocks). */
const USAGE_SOURCES: UsageSource[] = [
  { table: "profile", column: "avatar_media_id", entityType: "profile", labelSql: "full_name", field: "Avatar", href: () => "/admin/profile" },
  { table: "profile", column: "cv_media_id", entityType: "profile", labelSql: "full_name", field: "CV", href: () => "/admin/profile" },
  { table: "site_settings", column: "default_og_image_id", entityType: "settings", labelSql: "site_name", field: "Default social image", href: () => "/admin/settings" },
  { table: "seo_metadata", column: "og_image_id", entityType: "seo", labelSql: "coalesce(route_key, title, 'Content SEO')", field: "Social image", href: () => "/admin/seo" },
  { table: "experiences", column: "company_logo_id", entityType: "experience", labelSql: "company", field: "Company logo", href: (id) => `/admin/experiences/${id}` },
  { table: "education", column: "institution_logo_id", entityType: "education", labelSql: "institution", field: "Institution logo", href: (id) => `/admin/education/${id}` },
  { table: "projects", column: "cover_media_id", entityType: "project", labelSql: "title", field: "Cover", href: (id) => `/admin/projects/${id}` },
  { table: "project_media", column: "media_id", entityType: "project", labelSql: "(SELECT title FROM projects p WHERE p.id = project_id)", field: "Gallery", href: (id) => `/admin/projects/${id}` },
  { table: "research", column: "pdf_media_id", entityType: "research", labelSql: "title", field: "PDF", href: (id) => `/admin/research/${id}` },
  { table: "research", column: "poster_media_id", entityType: "research", labelSql: "title", field: "Poster", href: (id) => `/admin/research/${id}` },
  { table: "research", column: "slides_media_id", entityType: "research", labelSql: "title", field: "Slides", href: (id) => `/admin/research/${id}` },
  { table: "research", column: "cover_media_id", entityType: "research", labelSql: "title", field: "Cover", href: (id) => `/admin/research/${id}` },
  { table: "publications", column: "pdf_media_id", entityType: "publication", labelSql: "title", field: "PDF", href: (id) => `/admin/publications/${id}` },
  { table: "conference_presentations", column: "poster_media_id", entityType: "presentation", labelSql: "title", field: "Poster", href: (id) => `/admin/presentations/${id}` },
  { table: "conference_presentations", column: "slides_media_id", entityType: "presentation", labelSql: "title", field: "Slides", href: (id) => `/admin/presentations/${id}` },
  { table: "credential_providers", column: "logo_media_id", entityType: "credential_provider", labelSql: "name", field: "Logo", href: (id) => `/admin/credential-providers/${id}` },
  { table: "credentials", column: "image_media_id", entityType: "credential", labelSql: "title", field: "Certificate image", href: (id) => `/admin/credentials/${id}` },
  { table: "credentials", column: "pdf_media_id", entityType: "credential", labelSql: "title", field: "Certificate PDF", href: (id) => `/admin/credentials/${id}` },
  { table: "blog_posts", column: "cover_media_id", entityType: "blog_post", labelSql: "title", field: "Cover", href: (id) => `/admin/blog-posts/${id}` },
  { table: "projects", column: "sections", entityType: "project", labelSql: "title", field: "Content", href: (id) => `/admin/projects/${id}`, json: true },
  { table: "research", column: "sections", entityType: "research", labelSql: "title", field: "Content", href: (id) => `/admin/research/${id}`, json: true },
  { table: "blog_posts", column: "body", entityType: "blog_post", labelSql: "title", field: "Content", href: (id) => `/admin/blog-posts/${id}`, json: true },
];

export async function findMediaUsage(db: DbExecutor, mediaId: string): Promise<MediaUsageDTO[]> {
  const usages: MediaUsageDTO[] = [];
  for (const source of USAGE_SOURCES) {
    // Identifiers come from the constant list above, never from input.
    const idColumn = source.table === "project_media" ? "project_id" : source.table === "profile" || source.table === "site_settings" ? "id::text" : "id";
    const condition = source.json
      ? sql`${sql.raw(source.column)}::text LIKE ${`%${mediaId}%`}`
      : sql`${sql.raw(source.column)} = ${mediaId}`;
    const result = await db.execute<{ id: string; label: string | null }>(
      sql`SELECT ${sql.raw(idColumn)} AS id, ${sql.raw(source.labelSql)} AS label FROM ${sql.raw(source.table)} WHERE ${condition}`,
    );
    for (const row of result.rows) {
      usages.push({
        entityType: source.entityType,
        entityId: String(row.id),
        label: row.label ?? source.entityType,
        field: source.field,
        href: source.href(String(row.id)),
      });
    }
  }
  return usages;
}

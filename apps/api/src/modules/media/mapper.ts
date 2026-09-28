import { inArray } from "drizzle-orm";
import type { AdminMediaDTO, MediaDTO } from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import { media } from "../../database/schema";
import { isoRequired } from "../../lib/http";

export type MediaRow = typeof media.$inferSelect;

export function mediaUrl(storageKey: string): string {
  return `/media/${storageKey}`;
}

export function toMediaDTO(row: MediaRow): MediaDTO {
  return {
    id: row.id,
    url: mediaUrl(row.storageKey),
    kind: row.kind,
    mimeType: row.mimeType,
    fileName: row.originalName,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    alt: row.altText ?? "",
    caption: row.caption,
    title: row.title,
  };
}

export function toAdminMediaDTO(row: MediaRow, uploadedBy: string | null = null): AdminMediaDTO {
  return {
    ...toMediaDTO(row),
    originalName: row.originalName,
    checksum: row.checksumSha256,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
    uploadedBy,
  };
}

/** Loads media rows for a set of ids (nulls ignored) into a lookup map. */
export async function loadMediaMap(
  db: DbExecutor,
  ids: readonly (string | null | undefined)[],
): Promise<Map<string, MediaDTO>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const rows = await db.select().from(media).where(inArray(media.id, unique));
  return new Map(rows.map((row) => [row.id, toMediaDTO(row)]));
}

export function pick(map: Map<string, MediaDTO>, id: string | null | undefined): MediaDTO | null {
  return id ? (map.get(id) ?? null) : null;
}

/** Subset of the map for the given ids, as a plain object (for block rendering). */
export function mediaRecord(map: Map<string, MediaDTO>, ids: readonly string[]): Record<string, MediaDTO> {
  const record: Record<string, MediaDTO> = {};
  for (const id of ids) {
    const item = map.get(id);
    if (item) record[id] = item;
  }
  return record;
}

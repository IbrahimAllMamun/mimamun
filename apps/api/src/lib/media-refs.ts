import { inArray } from "drizzle-orm";
import { collectBlockMediaIds, type Block, type MediaKind } from "@portfolio/shared";
import type { DbExecutor } from "../database/client";
import { media } from "../database/schema";
import { badRequest } from "./errors";

/**
 * Content blocks reference media by id inside JSON, where the database cannot
 * enforce a foreign key; this check runs on every save instead.
 */
export async function assertMediaExists(
  db: DbExecutor,
  references: { id: string | null | undefined; kind?: MediaKind; path: string }[],
): Promise<void> {
  const wanted = references.filter((ref): ref is { id: string; kind?: MediaKind; path: string } => Boolean(ref.id));
  if (wanted.length === 0) return;
  const rows = await db
    .select({ id: media.id, kind: media.kind })
    .from(media)
    .where(inArray(media.id, [...new Set(wanted.map((ref) => ref.id))]));
  const kinds = new Map(rows.map((row) => [row.id, row.kind]));
  const problems = wanted
    .filter((ref) => !kinds.has(ref.id) || (ref.kind && kinds.get(ref.id) !== ref.kind))
    .map((ref) => ({
      path: ref.path,
      message: kinds.has(ref.id) ? `Choose a ${ref.kind} file` : "The selected file no longer exists",
    }));
  if (problems.length) throw badRequest("Some selected files are missing or of the wrong type", problems);
}

export function blockMediaReferences(
  blocks: readonly Block[],
  path: string,
): { id: string; kind?: MediaKind; path: string }[] {
  const references: { id: string; kind?: MediaKind; path: string }[] = [];
  blocks.forEach((block, index) => {
    const at = `${path}.${index}`;
    if (block.type === "image") references.push({ id: block.data.mediaId, kind: "image", path: at });
    if (block.type === "gallery") {
      for (const item of block.data.items) references.push({ id: item.mediaId, kind: "image", path: at });
    }
    if (block.type === "file") references.push({ id: block.data.mediaId, kind: "document", path: at });
    if (block.type === "video" && block.data.mediaId) {
      references.push({ id: block.data.mediaId, kind: "video", path: at });
    }
  });
  return references;
}

export function sectionMediaReferences(
  sections: Partial<Record<string, Block[]>>,
): { id: string; kind?: MediaKind; path: string }[] {
  return Object.entries(sections).flatMap(([key, blocks]) =>
    blocks ? blockMediaReferences(blocks, `sections.${key}`) : [],
  );
}

export { collectBlockMediaIds };

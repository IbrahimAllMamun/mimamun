import { blocksToPlainText, type Block } from "@portfolio/shared";

/**
 * Builds the plain-text column that feeds each table's generated `search_vector`.
 * Title and summary are indexed separately (higher weights) by PostgreSQL.
 */
export function buildSearchText(parts: {
  sections?: Partial<Record<string, Block[]>> | null;
  blocks?: Block[] | null;
  lists?: (readonly string[] | null | undefined)[];
  texts?: (string | null | undefined)[];
}): string {
  const chunks: string[] = [];
  if (parts.sections) {
    for (const blocks of Object.values(parts.sections)) {
      if (blocks?.length) chunks.push(blocksToPlainText(blocks));
    }
  }
  if (parts.blocks?.length) chunks.push(blocksToPlainText(parts.blocks));
  for (const list of parts.lists ?? []) if (list?.length) chunks.push(list.join(" "));
  for (const text of parts.texts ?? []) if (text) chunks.push(text);
  // Keep the column bounded; tsvector has a 1 MB limit and search quality does not need more.
  return chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, 200_000);
}

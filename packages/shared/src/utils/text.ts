import type { Block } from "../content/blocks";

/** Converts a title to a URL slug: "Flood Event Prediction (2025)" → "flood-event-prediction-2025". */
export function slugify(input: string, maxLength = 96): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= maxLength) return base || "untitled";
  const cut = base.slice(0, maxLength);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > maxLength / 2 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/g, "");
}

/** Rough Markdown → plain text for excerpts, search indexing and reading time. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\|/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Plain text of a block list — used for search vectors and reading time. */
export function blocksToPlainText(blocks: readonly Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        parts.push(block.data.text);
        break;
      case "paragraph":
        parts.push(markdownToPlainText(block.data.markdown));
        break;
      case "callout":
        if (block.data.title) parts.push(block.data.title);
        parts.push(markdownToPlainText(block.data.markdown));
        break;
      case "quote":
        parts.push(block.data.text);
        break;
      case "methodology":
        if (block.data.title) parts.push(block.data.title);
        for (const step of block.data.steps) {
          parts.push(step.title, markdownToPlainText(step.description));
        }
        break;
      case "table":
        if (block.data.caption) parts.push(block.data.caption);
        parts.push(block.data.columns.map((column) => column.label).join(" "));
        break;
      case "chart":
        parts.push(block.data.title, block.data.description);
        break;
      case "metric":
        for (const item of block.data.items) parts.push(`${item.label} ${item.value}`);
        break;
      case "image":
      case "video":
        if (block.data.caption) parts.push(block.data.caption);
        break;
      default:
        break;
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Minutes at ~220 words per minute, never less than one. */
export function readingTimeMinutes(text: string, wordsPerMinute = 220): number {
  return Math.max(1, Math.round(wordCount(text) / wordsPerMinute));
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace >= maxLength * 0.5 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, "")}…`;
}

/** Joins list items as prose: ["R", "Python", "SQL"] → "R, Python and SQL". */
export function joinList(items: readonly string[], conjunction = "and"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

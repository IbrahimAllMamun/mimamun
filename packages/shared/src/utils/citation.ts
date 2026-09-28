import { yearOf } from "./dates";

/**
 * Citation formatting. Only fields that exist are used — nothing is inferred,
 * so an incomplete record produces a shorter (but truthful) citation.
 */

export interface CitablePublication {
  title: string;
  authors: readonly string[];
  venue?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  publisher?: string | null;
  publishedOn?: string | null;
  doi?: string | null;
  url?: string | null;
  publicationType?: string | null;
}

/** "Ibrahim All-Mamun" → "All-Mamun, I."; "All-Mamun, Ibrahim" → "All-Mamun, I." */
export function apaAuthorName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  let surname: string;
  let given: string[];
  if (trimmed.includes(",")) {
    const [last, first = ""] = trimmed.split(",", 2);
    surname = (last ?? "").trim();
    given = first.trim().split(/\s+/).filter(Boolean);
  } else {
    const parts = trimmed.split(/\s+/);
    surname = parts.pop() ?? "";
    given = parts;
  }
  const initials = given.map((part) =>
    part
      .split("-")
      .map((piece) => `${piece.charAt(0).toUpperCase()}.`)
      .join("-"),
  );
  return initials.length ? `${surname}, ${initials.join(" ")}` : surname;
}

export function apaAuthorList(authors: readonly string[]): string {
  const names = authors.map(apaAuthorName).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] as string;
  if (names.length === 2) return `${names[0]}, & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
}

function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function doiUrl(doi: string): string {
  return `https://doi.org/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`;
}

export function formatApaCitation(publication: CitablePublication): string {
  const parts: string[] = [];
  const authors = apaAuthorList(publication.authors);
  const year = yearOf(publication.publishedOn ?? null);
  parts.push(authors ? `${authors} (${year ?? "n.d."}).` : `(${year ?? "n.d."}).`);
  parts.push(sentence(publication.title));
  if (publication.venue) {
    let venue = publication.venue;
    if (publication.volume) venue += `, ${publication.volume}`;
    if (publication.issue) venue += `(${publication.issue})`;
    if (publication.pages) venue += `, ${publication.pages}`;
    parts.push(sentence(venue));
  } else if (publication.publisher) {
    parts.push(sentence(publication.publisher));
  }
  if (publication.doi) parts.push(doiUrl(publication.doi));
  else if (publication.url) parts.push(publication.url);
  return parts.join(" ");
}

const BIBTEX_TYPES: Record<string, string> = {
  journal_article: "article",
  conference_paper: "inproceedings",
  book_chapter: "incollection",
  thesis: "mastersthesis",
  report: "techreport",
  preprint: "misc",
  other: "misc",
};

function bibtexEscape(value: string): string {
  return value.replace(/[{}\\]/g, "").replace(/([&%$#_])/g, "\\$1");
}

export function bibtexKey(publication: CitablePublication): string {
  const firstAuthor = publication.authors[0] ?? "anon";
  const surname = apaAuthorName(firstAuthor).split(",")[0] ?? "anon";
  const word = publication.title.toLowerCase().match(/[a-z]{4,}/)?.[0] ?? "work";
  return `${surname.toLowerCase().replace(/[^a-z]/g, "")}${yearOf(publication.publishedOn ?? null) ?? ""}${word}`;
}

export function formatBibtex(publication: CitablePublication): string {
  const type = BIBTEX_TYPES[publication.publicationType ?? "other"] ?? "misc";
  const fields: [string, string | null | undefined][] = [
    ["author", publication.authors.join(" and ")],
    ["title", publication.title],
    [type === "article" ? "journal" : "booktitle", publication.venue],
    ["volume", publication.volume],
    ["number", publication.issue],
    ["pages", publication.pages],
    ["publisher", publication.publisher],
    ["year", yearOf(publication.publishedOn ?? null)?.toString()],
    ["doi", publication.doi],
    ["url", publication.url],
  ];
  const body = fields
    .filter(([, value]) => value)
    .map(([key, value]) => `  ${key} = {${bibtexEscape(value as string)}}`)
    .join(",\n");
  return `@${type}{${bibtexKey(publication)},\n${body}\n}`;
}

export interface CitableResearch {
  title: string;
  author: string;
  kindNoun: string;
  degree?: string | null;
  institution?: string | null;
  completedOn?: string | null;
}

/** e.g. "All-Mamun, I. (2025). Title [M.S. project, University of Dhaka]." */
export function formatResearchCitation(research: CitableResearch): string {
  const year = yearOf(research.completedOn ?? null);
  const degree = research.degree ? research.degree.split(/\s+in\s+/i)[0]?.trim() : null;
  const descriptor = [
    degree ? `${degree} ${research.kindNoun}` : research.kindNoun,
    research.institution,
  ]
    .filter(Boolean)
    .join(", ");
  const descriptorText = descriptor
    ? ` [${descriptor.charAt(0).toUpperCase()}${descriptor.slice(1)}]`
    : "";
  return `${apaAuthorName(research.author)} (${year ?? "n.d."}). ${research.title.replace(/[.]$/, "")}${descriptorText}.`;
}

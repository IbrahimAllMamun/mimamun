import type { MediaAccept, OptionDTO } from "@portfolio/shared";

export type AdminFieldKind =
  | "text"
  | "textarea"
  | "markdown"
  | "code"
  | "number"
  | "select"
  | "boolean"
  | "url"
  | "email"
  | "slug"
  | "month"
  | "date"
  | "datetime"
  | "string-list"
  | "lines"
  | "relation"
  | "relations"
  | "media"
  | "repeater"
  | "blocks"
  | "sections"
  | "seo"
  | "chart-data"
  | "table-data";

export type FormRecord = Record<string, unknown>;

export interface AdminField {
  name: string;
  label: string;
  kind: AdminFieldKind;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: readonly { value: string | number; label: string }[];
  /** Options endpoint list for relation fields (see /api/admin/options). */
  optionsType?: string;
  /** Narrows relation options using the current record (e.g. same provider). */
  filterOptions?: (option: OptionDTO, record: FormRecord) => boolean;
  /** Label of the empty choice for optional selects and relations. */
  emptyLabel?: string;
  accept?: MediaAccept;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  /** Sub-fields of a repeater. */
  fields?: readonly AdminField[];
  maxItems?: number;
  itemLabel?: string;
  /** Section set of a `sections` field. */
  sectionSet?: "project" | "research";
  /** Public URL prefix shown next to a slug, e.g. "/projects/". */
  slugBase?: string;
  width?: "full" | "half";
  showWhen?: { field: string; equals: readonly (string | number | boolean)[] };
}

export interface FieldGroup {
  title: string;
  description?: string;
  fields: AdminField[];
}

export interface AdminResource {
  /** API and admin URL segment, e.g. "projects". */
  path: string;
  label: string;
  plural: string;
  description: string;
  /** Record title for headings and messages. */
  title: (record: FormRecord) => string;
  /** Draft → published → archived, with visibility, featured and publish date. */
  editorial?: boolean;
  featurable?: boolean;
  visibleToggle?: boolean;
  orderable?: boolean;
  /** Preview route type (/preview/{type}/{id}). */
  preview?: "projects" | "research" | "blog-posts";
  /** Public URL of a published record. */
  publicPath?: (record: FormRecord) => string | null;
  typeFilter?: { label: string; options: readonly { value: string; label: string }[] };
  parentFilter?: { label: string; optionsType: string };
  /** Extra list columns read from `item.extra`. */
  columns?: { key: string; label: string }[];
  sorts?: { value: string; label: string }[];
  /** Show the list as a tree (all rows, indented by parent). */
  tree?: { parentKey: string; groupKey?: string; groupOptionsType?: string };
  groups: FieldGroup[];
  initial: () => FormRecord;
}

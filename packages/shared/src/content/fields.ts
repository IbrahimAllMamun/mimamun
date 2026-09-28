/**
 * Declarative field definitions. The admin renders editors for content blocks
 * (and simple resources) from these definitions, so adding a new block type
 * does not require writing a new editor component.
 */
export type FieldKind =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "select"
  | "boolean"
  | "media"
  | "url"
  | "code"
  | "repeater"
  | "string-list"
  | "chart-data"
  | "table-data";

export type MediaAccept = "image" | "document" | "video" | "any";

export interface FieldOption {
  value: string | number;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: readonly FieldOption[];
  accept?: MediaAccept;
  rows?: number;
  min?: number;
  max?: number;
  maxLength?: number;
  /** Sub-fields for `repeater` fields. */
  fields?: readonly FieldDef[];
  maxItems?: number;
  /** Field is shown only when another field has one of these values. */
  showWhen?: { field: string; equals: readonly (string | number | boolean)[] };
}

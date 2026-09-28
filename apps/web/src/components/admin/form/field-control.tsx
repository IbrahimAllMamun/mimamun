"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import { EMPTY_SEO } from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { AdminField } from "../resources/types";
import { BlocksField, ChartDataField, SectionsField, TableDataField } from "./blocks-editor";
import { errorsUnder, useForm } from "./form-context";
import { MediaField } from "./media-field";
import { getIn } from "./paths";
import {
  asText,
  CharCount,
  LinesInput,
  localDateTime,
  MarkdownInput,
  monthValue,
  RelationSelect,
  RelationsInput,
  simpleFieldPlaceholder,
  SlugInput,
  StringListInput,
} from "./simple-fields";

function parentPath(path: string): string {
  return path.split(".").slice(0, -1).join(".");
}

/** Renders the editor for one field definition at a dot path in the form record. */
export function FieldControl({ field, path }: { field: AdminField; path: string }) {
  const form = useForm();
  const value = getIn(form.record, path);
  const error = form.errors[path];
  const set = (next: unknown) => form.setValue(path, next);

  if (field.showWhen) {
    const base = parentPath(path);
    const other = getIn(
      form.record,
      base ? `${base}.${field.showWhen.field}` : field.showWhen.field,
    );
    if (!field.showWhen.equals.includes(other as string | number | boolean)) return null;
  }

  switch (field.kind) {
    case "boolean":
      return <BooleanField field={field} path={path} />;
    case "repeater":
      return <RepeaterField field={field} path={path} />;
    case "blocks":
      return <BlocksField path={path} />;
    case "sections":
      return <SectionsField path={path} set={field.sectionSet ?? "project"} />;
    case "seo":
      return <SeoFields path={path} />;
    case "table-data":
      return <TableDataField field={field} path={path} />;
    case "chart-data":
      return <ChartDataField field={field} path={path} />;
    default:
      break;
  }

  const options = field.optionsType
    ? (form.options[field.optionsType] ?? []).filter(
        (option) =>
          !field.filterOptions ||
          field.filterOptions(
            option,
            (getIn(form.record, parentPath(path)) as Record<string, unknown>) ?? form.record,
          ),
      )
    : [];

  return (
    <Field label={field.label} required={field.required} error={error} description={field.help}>
      {(control) => {
        const common = { ...control, disabled: form.disabled };
        switch (field.kind) {
          case "textarea":
          case "code":
            return (
              <>
                <Textarea
                  {...common}
                  rows={field.rows ?? 4}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  value={asText(value)}
                  onChange={(event) => set(event.target.value)}
                  className={field.kind === "code" ? "font-mono text-sm" : undefined}
                  spellCheck={field.kind === "code" ? false : undefined}
                />
                <CharCount value={asText(value)} max={field.maxLength} />
              </>
            );
          case "markdown":
            return (
              <MarkdownInput
                control={common}
                rows={field.rows}
                maxLength={field.maxLength}
                value={asText(value)}
                onChange={set}
              />
            );
          case "number":
            return (
              <Input
                {...common}
                type="number"
                inputMode="decimal"
                step={field.step ?? "any"}
                min={field.min}
                max={field.max}
                placeholder={field.placeholder}
                value={asText(value)}
                onChange={(event) => set(event.target.value === "" ? null : event.target.value)}
              />
            );
          case "select":
            return (
              <Select
                {...common}
                value={value === null || value === undefined ? "" : String(value)}
                onChange={(event) => {
                  const option = field.options?.find(
                    (item) => String(item.value) === event.target.value,
                  );
                  set(option ? option.value : null);
                }}
              >
                {field.emptyLabel !== undefined || !field.options?.length ? (
                  <option value="">{field.emptyLabel ?? "None"}</option>
                ) : null}
                {field.options?.map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </Select>
            );
          case "slug":
            return (
              <SlugInput
                control={common}
                value={asText(value)}
                onChange={set}
                base={field.slugBase}
                record={form.record}
              />
            );
          case "month":
            return (
              <Input
                {...common}
                type="month"
                value={monthValue(value)}
                onChange={(event) => set(event.target.value || null)}
                className="max-w-48"
              />
            );
          case "date":
            return (
              <Input
                {...common}
                type="date"
                value={asText(value).slice(0, 10)}
                onChange={(event) => set(event.target.value || null)}
                className="max-w-48"
              />
            );
          case "datetime":
            return (
              <Input
                {...common}
                type="datetime-local"
                value={localDateTime(value)}
                onChange={(event) =>
                  set(event.target.value ? new Date(event.target.value).toISOString() : null)
                }
                className="max-w-64"
              />
            );
          case "string-list":
            return (
              <StringListInput
                control={common}
                value={Array.isArray(value) ? (value as string[]) : []}
                onChange={set}
                placeholder={field.placeholder}
              />
            );
          case "lines":
            return (
              <LinesInput
                control={common}
                rows={field.rows}
                value={Array.isArray(value) ? (value as string[]) : []}
                onChange={set}
              />
            );
          case "relation":
            return (
              <RelationSelect
                control={common}
                value={(value as string | null) ?? null}
                onChange={set}
                options={options}
                emptyLabel={field.emptyLabel}
                required={field.required}
              />
            );
          case "relations":
            return (
              <RelationsInput
                label={field.label}
                value={Array.isArray(value) ? (value as string[]) : []}
                onChange={set}
                options={options}
              />
            );
          case "media":
            return (
              <MediaField
                value={(value as string | null) ?? null}
                onChange={set}
                accept={field.accept}
                describedBy={control["aria-describedby"]}
              />
            );
          case "url":
          case "email":
          case "text":
          default:
            return (
              <>
                <Input
                  {...common}
                  type={field.kind === "url" ? "url" : field.kind === "email" ? "email" : "text"}
                  inputMode={
                    field.kind === "url" ? "url" : field.kind === "email" ? "email" : undefined
                  }
                  maxLength={field.maxLength}
                  placeholder={simpleFieldPlaceholder(field)}
                  value={asText(value)}
                  onChange={(event) => set(event.target.value)}
                />
                {field.maxLength && field.maxLength <= 320 ? (
                  <CharCount value={asText(value)} max={field.maxLength} />
                ) : null}
              </>
            );
        }
      }}
    </Field>
  );
}

function BooleanField({ field, path }: { field: AdminField; path: string }) {
  const form = useForm();
  const id = useId();
  const checked = Boolean(getIn(form.record, path));
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink"
      >
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={form.disabled}
          onChange={(event) => form.setValue(path, event.target.checked)}
          aria-describedby={field.help ? `${id}-help` : undefined}
          className="size-4 accent-primary"
        />
        {field.label}
      </label>
      {field.help ? (
        <p id={`${id}-help`} className="pl-7 text-sm text-ink-3">
          {field.help}
        </p>
      ) : null}
      {form.errors[path] ? <p className="pl-7 text-sm text-error">{form.errors[path]}</p> : null}
    </div>
  );
}

function emptyItem(fields: readonly AdminField[]): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.kind === "select" && field.options?.length && field.emptyLabel === undefined)
      item[field.name] = field.options[0]?.value;
    else if (field.kind === "boolean") item[field.name] = false;
    else if (field.kind === "media" || field.kind === "relation") item[field.name] = null;
    else if (
      field.kind === "string-list" ||
      field.kind === "lines" ||
      field.kind === "relations" ||
      field.kind === "repeater"
    )
      item[field.name] = [];
    else item[field.name] = "";
  }
  return item;
}

/** A list of small sub-forms (metrics, gallery items, steps) with add, remove and reorder. */
export function RepeaterField({ field, path }: { field: AdminField; path: string }) {
  const form = useForm();
  const items = (getIn(form.record, path) as Record<string, unknown>[] | undefined) ?? [];
  const fields = field.fields ?? [];
  const itemLabel = field.itemLabel ?? "Item";
  const move = (from: number, to: number) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    form.setValue(path, next);
  };
  const groupErrors = errorsUnder(form.errors, path).length;
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 flex w-full items-baseline justify-between text-sm font-medium text-ink">
        {field.label}
        <span className="text-xs font-normal text-ink-3">
          {items.length}
          {field.maxItems ? ` / ${field.maxItems}` : ""}
        </span>
      </legend>
      {field.help ? <p className="text-sm text-ink-3">{field.help}</p> : null}
      {form.errors[path] ? <p className="text-sm text-error">{form.errors[path]}</p> : null}
      {items.map((_, index) => (
        <div
          key={index}
          className={cn(
            "rounded-sm border bg-surface p-4",
            errorsUnder(form.errors, `${path}.${index}`).length ? "border-error/60" : "border-rule",
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="label">
              {itemLabel} {index + 1}
            </p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} up`}
              >
                <Icon icon={ArrowUp} size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === items.length - 1}
                onClick={() => move(index, index + 1)}
                aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} down`}
              >
                <Icon icon={ArrowDown} size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  form.setValue(
                    path,
                    items.filter((__, i) => i !== index),
                  )
                }
                aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
              >
                <Icon icon={Trash2} size={14} />
              </Button>
            </div>
          </div>
          <FieldGrid fields={fields} base={`${path}.${index}`} />
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={Boolean(field.maxItems && items.length >= field.maxItems) || form.disabled}
        onClick={() => form.setValue(path, [...items, emptyItem(fields)])}
      >
        <Icon icon={Plus} size={14} /> Add {itemLabel.toLowerCase()}
      </Button>
      {groupErrors && !form.errors[path] ? (
        <span className="sr-only">{groupErrors} problems in this list</span>
      ) : null}
    </fieldset>
  );
}

/** Lays fields out in a two-column grid; half-width fields pair up on wide screens. */
export function FieldGrid({ fields, base }: { fields: readonly AdminField[]; base?: string }) {
  return (
    <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.name}
          className={field.width === "half" ? "sm:col-span-1" : "sm:col-span-2"}
        >
          <FieldControl field={field} path={base ? `${base}.${field.name}` : field.name} />
        </div>
      ))}
    </div>
  );
}

/** SEO overrides with a search-result preview. */
export function SeoFields({ path }: { path: string }) {
  const form = useForm();
  const seo = {
    ...EMPTY_SEO,
    ...((getIn(form.record, path) as Record<string, unknown> | null) ?? {}),
  };
  const fallbackTitle = asText(form.record.title ?? form.record.name);
  const fallbackDescription = asText(
    form.record.summary ?? form.record.excerpt ?? form.record.description,
  );
  const title = asText(seo.title) || fallbackTitle || "Page title";
  const description =
    asText(seo.description) || fallbackDescription || "The page description appears here.";
  const fields: AdminField[] = [
    {
      name: "title",
      label: "Title for search engines",
      kind: "text",
      maxLength: 120,
      help: "Leave empty to use the page title.",
    },
    {
      name: "description",
      label: "Description",
      kind: "textarea",
      rows: 2,
      maxLength: 300,
      help: "Leave empty to use the short description.",
    },
    {
      name: "canonicalUrl",
      label: "Canonical URL",
      kind: "url",
      help: "Only if this content first appeared elsewhere.",
    },
    {
      name: "ogImageId",
      label: "Social image",
      kind: "media",
      accept: "image",
      help: "1200×630 works best. Otherwise a card is generated.",
    },
    { name: "noindex", label: "Hide from search engines", kind: "boolean" },
  ];
  return (
    <div className="space-y-5">
      <div aria-hidden className="rounded-sm border border-rule bg-surface p-4">
        <p className="label mb-2">Search preview</p>
        <p className="truncate text-lg text-info">{title}</p>
        <p className="line-clamp-2 text-sm text-ink-2">{description}</p>
      </div>
      <FieldGrid fields={fields} base={path} />
    </div>
  );
}

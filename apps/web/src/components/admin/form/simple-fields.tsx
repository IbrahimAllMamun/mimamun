"use client";

import { Eye, Link2, PenLine, RefreshCw, X } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { slugify, type OptionDTO } from "@portfolio/shared";
import { Markdown } from "@/components/content/markdown";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { AdminField, FormRecord } from "../resources/types";

export type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  required?: boolean;
};

export const asText = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

export function CharCount({ value, max }: { value: string; max?: number }) {
  if (!max) return null;
  const near = value.length > max * 0.9;
  return (
    <p
      aria-hidden
      className={cn(
        "text-right font-mono text-xs tabular-nums",
        near ? "text-accent" : "text-ink-3",
      )}
    >
      {value.length} / {max}
    </p>
  );
}

export function MarkdownInput({
  control,
  value,
  onChange,
  rows = 6,
  maxLength,
}: {
  control: ControlProps;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
}) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  return (
    <div className="space-y-1.5">
      <div role="tablist" aria-label="Editor mode" className="flex gap-1">
        {(["write", "preview"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={mode === item}
            onClick={() => setMode(item)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-xs px-2.5 text-xs",
              mode === item ? "bg-muted font-medium text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            <Icon icon={item === "write" ? PenLine : Eye} size={13} />
            {item === "write" ? "Write" : "Preview"}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-ink-3">
          Markdown: **bold**, _italic_, [link](https://…), - list
        </span>
      </div>
      {mode === "write" ? (
        <Textarea
          {...control}
          rows={rows}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono text-sm"
        />
      ) : (
        <div className="min-h-32 rounded-xs border border-rule bg-surface px-4 py-3">
          {value.trim() ? (
            <Markdown source={value} className="prose-ui" />
          ) : (
            <p className="text-sm text-ink-3">Nothing to preview.</p>
          )}
        </div>
      )}
      <CharCount value={value} max={maxLength} />
    </div>
  );
}

export function SlugInput({
  control,
  value,
  onChange,
  base,
  record,
}: {
  control: ControlProps;
  value: string;
  onChange: (value: string) => void;
  base?: string;
  record: FormRecord;
}) {
  const source = asText(record.title ?? record.name ?? record.label);
  return (
    <div className="space-y-1.5">
      <div className="flex items-stretch">
        {base ? (
          <span className="inline-flex items-center rounded-l-xs border border-r-0 border-rule-strong bg-muted px-2.5 font-mono text-xs text-ink-3">
            {base}
          </span>
        ) : null}
        <Input
          {...control}
          value={value}
          onChange={(event) =>
            onChange(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
          }
          placeholder={source ? slugify(source) : "created-from-the-title"}
          className={cn("font-mono text-sm", base && "rounded-l-none")}
        />
        <button
          type="button"
          onClick={() => onChange(slugify(source))}
          disabled={!source}
          className="ml-2 inline-flex shrink-0 items-center gap-1.5 rounded-xs px-2 text-xs text-primary hover:bg-primary-tint disabled:opacity-40"
        >
          <Icon icon={RefreshCw} size={13} /> From title
        </button>
      </div>
    </div>
  );
}

/** Chips for short values (technologies, tags): Enter or comma adds, Backspace removes the last. */
export function StringListInput({
  control,
  value,
  onChange,
  placeholder,
}: {
  control: ControlProps;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const items = raw
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    const next = [...value];
    for (const item of items)
      if (!next.some((existing) => existing.toLowerCase() === item.toLowerCase())) next.push(item);
    onChange(next);
    setDraft("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xs border border-rule-strong bg-elevated px-2 py-1.5 focus-within:border-ink">
      {value.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="inline-flex items-center gap-1 rounded-xs bg-muted py-0.5 pr-1 pl-2 text-sm text-ink"
        >
          {item}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            className="rounded-xs p-0.5 text-ink-3 hover:bg-rule hover:text-ink"
            aria-label={`Remove ${item}`}
          >
            <Icon icon={X} size={12} />
          </button>
        </span>
      ))}
      <input
        {...control}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text");
          if (/[,\n]/.test(text)) {
            event.preventDefault();
            add(text);
          }
        }}
        placeholder={value.length ? "" : (placeholder ?? "Type and press Enter")}
        className="min-h-8 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-ink-3"
      />
    </div>
  );
}

/** One item per line, for longer entries such as responsibilities. */
export function LinesInput({
  control,
  value,
  onChange,
  rows = 5,
}: {
  control: ControlProps;
  value: string[];
  onChange: (value: string[]) => void;
  rows?: number;
}) {
  return (
    <Textarea
      {...control}
      rows={rows}
      value={value.join("\n")}
      onChange={(event) => onChange(event.target.value.split("\n"))}
    />
  );
}

export function RelationSelect({
  control,
  value,
  onChange,
  options,
  emptyLabel,
  required,
}: {
  control: ControlProps;
  value: string | null;
  onChange: (value: string | null) => void;
  options: OptionDTO[];
  emptyLabel?: string;
  required?: boolean;
}) {
  const known = value === null || options.some((option) => option.id === value);
  return (
    <Select
      {...control}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || null)}
    >
      {required && value ? null : (
        <option value="">{emptyLabel ?? (required ? "Choose…" : "None")}</option>
      )}
      {!known ? <option value={value ?? ""}>(unavailable item)</option> : null}
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
          {option.hint &&
          !option.hint.includes("|") &&
          !["draft", "published", "archived"].includes(option.hint)
            ? ` — ${option.hint}`
            : ""}
          {option.hint === "draft" ? " (draft)" : option.hint === "archived" ? " (archived)" : ""}
        </option>
      ))}
    </Select>
  );
}

/** Checkbox list with a filter box; selected items are listed first as removable chips. */
export function RelationsInput({
  value,
  onChange,
  options,
  label,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options: OptionDTO[];
  label: string;
}) {
  const [filter, setFilter] = useState("");
  const id = useId();
  const byId = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const visible = options.filter((option) =>
    option.label.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const toggle = (optionId: string) =>
    onChange(
      value.includes(optionId) ? value.filter((item) => item !== optionId) : [...value, optionId],
    );
  return (
    <div className="space-y-2">
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={`Selected ${label.toLowerCase()}`}>
          {value.map((optionId) => (
            <li
              key={optionId}
              className="inline-flex items-center gap-1 rounded-xs bg-primary-tint py-0.5 pr-1 pl-2 text-sm text-ink"
            >
              <Icon icon={Link2} size={12} className="text-primary" />
              {byId.get(optionId)?.label ?? "(unavailable item)"}
              <button
                type="button"
                onClick={() => toggle(optionId)}
                className="rounded-xs p-0.5 text-ink-3 hover:text-ink"
                aria-label={`Remove ${byId.get(optionId)?.label ?? "item"}`}
              >
                <Icon icon={X} size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {options.length === 0 ? (
        <p className="text-sm text-ink-3">Nothing to choose from yet.</p>
      ) : (
        <div className="rounded-xs border border-rule-strong bg-elevated">
          {options.length > 6 ? (
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={`Filter ${label.toLowerCase()}`}
              aria-label={`Filter ${label.toLowerCase()}`}
              aria-controls={id}
              className="min-h-9 w-full border-b border-rule bg-transparent px-3 text-sm outline-none"
            />
          ) : null}
          <ul id={id} className="max-h-48 overflow-y-auto py-1">
            {visible.map((option) => (
              <li key={option.id}>
                <label className="flex min-h-9 cursor-pointer items-center gap-2.5 px-3 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={value.includes(option.id)}
                    onChange={() => toggle(option.id)}
                    className="size-4 accent-primary"
                  />
                  <span className="flex-1">{option.label}</span>
                  {option.hint && !option.hint.includes("|") ? (
                    <span className="text-xs text-ink-3">{option.hint}</span>
                  ) : null}
                </label>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-3">No matches.</li>
            ) : null}
          </ul>
        </div>
      )}
    </div>
  );
}

export function monthValue(value: unknown): string {
  const text = asText(value);
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : "";
}

export function localDateTime(value: unknown): string {
  const text = asText(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function simpleFieldPlaceholder(field: AdminField): string | undefined {
  if (field.placeholder) return field.placeholder;
  if (field.kind === "url") return "https://";
  if (field.kind === "email") return "name@example.com";
  return undefined;
}

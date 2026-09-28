"use client";

import {
  AppWindow,
  ArrowDown,
  ArrowUp,
  ChartLine,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  FileDown,
  Gauge,
  Heading,
  Image as ImageIcon,
  Images,
  MessageSquareQuote,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  Table,
  Trash2,
  Video,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useId, useState } from "react";
import {
  BLOCK_DEFINITIONS,
  chartDataToCsv,
  parseChartCsv,
  parseCsv,
  PROJECT_SECTIONS,
  RESEARCH_SECTIONS,
  type Block,
  type BlockType,
  type ChartBlockData,
} from "@portfolio/shared";
import { Chart } from "@/components/charts/chart";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { AdminField } from "../resources/types";
import { FieldGrid } from "./field-control";
import { errorsUnder, useForm } from "./form-context";
import { getIn, newId } from "./paths";

const BLOCK_ICONS: Record<string, LucideIcon> = {
  "app-window": AppWindow,
  "chart-line": ChartLine,
  code: Code,
  "file-down": FileDown,
  gauge: Gauge,
  heading: Heading,
  image: ImageIcon,
  images: Images,
  "message-square-quote": MessageSquareQuote,
  minus: Minus,
  pilcrow: Pilcrow,
  quote: Quote,
  table: Table,
  video: Video,
  workflow: Workflow,
};

const BLOCK_ORDER: BlockType[] = [
  "paragraph",
  "heading",
  "image",
  "chart",
  "table",
  "metric",
  "callout",
  "methodology",
  "code",
  "quote",
  "gallery",
  "video",
  "embed",
  "file",
  "divider",
];

function blockSummary(block: Block): string {
  const data = block.data as Record<string, unknown>;
  const text = [data.text, data.title, data.caption, data.markdown, data.code].find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;
  return text ? text.replace(/\s+/g, " ").slice(0, 80) : "";
}

function BlockPicker({
  onPick,
  label = "Add block",
}: {
  onPick: (type: BlockType) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Icon icon={Plus} size={14} /> {label}
      </Button>
      {open ? (
        <ul
          id={id}
          className="grid gap-1.5 rounded-sm border border-rule bg-elevated p-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {BLOCK_ORDER.map((type) => {
            const definition = BLOCK_DEFINITIONS[type];
            return (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(type);
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-2.5 rounded-xs p-2 text-left hover:bg-muted"
                >
                  <Icon
                    icon={BLOCK_ICONS[definition.icon] ?? Pilcrow}
                    size={16}
                    className="mt-0.5 shrink-0 text-primary"
                  />
                  <span>
                    <span className="block text-sm text-ink">{definition.label}</span>
                    <span className="block text-xs text-ink-3">{definition.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** Ordered content blocks with add, collapse, duplicate, reorder and remove. */
export function BlocksField({ path }: { path: string }) {
  const form = useForm();
  const blocks = (getIn(form.record, path) as Block[] | undefined) ?? [];
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const update = (next: Block[]) => form.setValue(path, next);
  const insert = (type: BlockType, at = blocks.length) => {
    const block = { id: newId(), type, data: BLOCK_DEFINITIONS[type].initial() } as Block;
    update([...blocks.slice(0, at), block, ...blocks.slice(at)]);
  };
  const move = (from: number, to: number) => {
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    update(next);
  };
  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      {blocks.length === 0 ? (
        <p className="text-sm text-ink-3">No content yet. Add a text block to start.</p>
      ) : null}
      {blocks.map((block, index) => {
        const definition = BLOCK_DEFINITIONS[block.type];
        if (!definition) return null;
        const isCollapsed = collapsed.has(block.id);
        const problems = errorsUnder(form.errors, `${path}.${index}`).length;
        return (
          <section
            key={block.id}
            aria-label={`${definition.label} block ${index + 1}`}
            className={cn(
              "rounded-sm border bg-surface",
              problems ? "border-error/60" : "border-rule",
            )}
          >
            <header className="flex items-center gap-2 border-b border-rule px-3 py-1.5">
              <button
                type="button"
                onClick={() => toggle(block.id)}
                aria-expanded={!isCollapsed}
                className="flex min-h-9 min-w-0 flex-1 items-center gap-2 text-left"
              >
                <Icon
                  icon={isCollapsed ? ChevronRight : ChevronDown}
                  size={14}
                  className="shrink-0 text-ink-3"
                />
                <Icon
                  icon={BLOCK_ICONS[definition.icon] ?? Pilcrow}
                  size={15}
                  className="shrink-0 text-primary"
                />
                <span className="text-sm font-medium text-ink">{definition.label}</span>
                {isCollapsed ? (
                  <span className="truncate text-sm text-ink-3">{blockSummary(block)}</span>
                ) : null}
                {problems ? (
                  <span className="ml-auto shrink-0 text-xs text-error">{problems} to fix</span>
                ) : null}
              </button>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label="Move block up"
                >
                  <Icon icon={ArrowUp} size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label="Move block down"
                >
                  <Icon icon={ArrowDown} size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    update([
                      ...blocks.slice(0, index + 1),
                      { ...structuredClone(block), id: newId() },
                      ...blocks.slice(index + 1),
                    ])
                  }
                  aria-label="Duplicate block"
                >
                  <Icon icon={Copy} size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => update(blocks.filter((_, i) => i !== index))}
                  aria-label="Remove block"
                >
                  <Icon icon={Trash2} size={14} />
                </Button>
              </div>
            </header>
            {isCollapsed ? null : (
              <div className="p-4">
                {definition.fields.length ? (
                  <FieldGrid
                    fields={definition.fields as readonly AdminField[]}
                    base={`${path}.${index}.data`}
                  />
                ) : (
                  <p className="text-sm text-ink-3">A horizontal rule between parts of the text.</p>
                )}
              </div>
            )}
          </section>
        );
      })}
      <BlockPicker onPick={(type) => insert(type)} />
    </div>
  );
}

/** Case-study or research sections, each an optional list of blocks. */
export function SectionsField({ path, set }: { path: string; set: "project" | "research" }) {
  const form = useForm();
  const sections = set === "project" ? PROJECT_SECTIONS : RESEARCH_SECTIONS;
  const value = (getIn(form.record, path) as Record<string, Block[]> | undefined) ?? {};
  const [open, setOpen] = useState<string | null>(
    () =>
      sections.find((section) => (value[section.key]?.length ?? 0) > 0)?.key ??
      sections[0]?.key ??
      null,
  );
  return (
    <div className="divide-y divide-rule rounded-sm border border-rule">
      {sections.map((section, index) => {
        const count = value[section.key]?.length ?? 0;
        const isOpen = open === section.key;
        const problems = errorsUnder(form.errors, `${path}.${section.key}`).length;
        return (
          <div key={section.key}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : section.key)}
              aria-expanded={isOpen}
              className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-muted"
            >
              <span className="font-mono text-xs text-ink-3">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-ink">{section.label}</span>
                {isOpen ? null : <span className="block text-xs text-ink-3">{section.help}</span>}
              </span>
              {problems ? <span className="text-xs text-error">{problems} to fix</span> : null}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-xs",
                  count ? "bg-primary-tint text-primary" : "text-ink-3",
                )}
              >
                {count ? `${count} block${count === 1 ? "" : "s"}` : "empty"}
              </span>
              <Icon icon={isOpen ? ChevronDown : ChevronRight} size={16} className="text-ink-3" />
            </button>
            {isOpen ? (
              <div className="space-y-3 bg-paper px-4 pt-1 pb-4">
                <p className="text-sm text-ink-3">{section.help}</p>
                <BlocksField path={`${path}.${section.key}`} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** CSV editor for chart data with validation and a live preview. */
export function ChartDataField({ field, path }: { field: AdminField; path: string }) {
  const form = useForm();
  const chartPath = path.split(".").slice(0, -1).join(".");
  const chart = getIn(form.record, chartPath) as ChartBlockData | undefined;
  const data = getIn(form.record, path) as ChartBlockData["data"] | undefined;
  const [text, setText] = useState(() =>
    data && data.x.length
      ? chartDataToCsv(data, chart?.xLabel ?? "x")
      : "year,series\n2024,1\n2025,2",
  );
  const parsed = parseChartCsv(text);
  const onChange = (next: string) => {
    setText(next);
    const result = parseChartCsv(next);
    if ("data" in result) form.setValue(path, result.data);
  };
  return (
    <div className="space-y-3">
      <Field
        label={field.label}
        required={field.required}
        error={"error" in parsed ? parsed.error : form.errors[path]}
        description={field.help}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={8}
            value={text}
            onChange={(event) => onChange(event.target.value)}
            className="font-mono text-sm"
            spellCheck={false}
          />
        )}
      </Field>
      {"data" in parsed && chart?.title ? (
        <div className="rounded-sm border border-rule bg-paper p-4">
          <p className="label mb-2">Preview</p>
          <Chart chart={{ ...chart, data: parsed.data }} />
        </div>
      ) : null}
    </div>
  );
}

/** CSV editor for table blocks; stores columns and rows on the block. */
export function TableDataField({ field, path }: { field: AdminField; path: string }) {
  const form = useForm();
  const base = path.split(".").slice(0, -1).join(".");
  const columns = (getIn(form.record, `${base}.columns`) as { label: string }[] | undefined) ?? [];
  const rows = (getIn(form.record, `${base}.rows`) as string[][] | undefined) ?? [];
  const [text, setText] = useState(() =>
    columns.length
      ? [columns.map((column) => column.label), ...rows]
          .map((row) =>
            row
              .map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell))
              .join(","),
          )
          .join("\n")
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const onChange = (next: string) => {
    setText(next);
    const parsed = parseCsv(next);
    const header = parsed[0];
    if (!header || header.length === 0) {
      setError("Add a header row.");
      return;
    }
    const bad = parsed.slice(1).findIndex((row) => row.length !== header.length);
    if (bad >= 0) {
      setError(`Row ${bad + 2} has ${parsed[bad + 1]?.length} cells; expected ${header.length}.`);
      return;
    }
    setError(null);
    form.setValue(
      `${base}.columns`,
      header.map((label) => ({ label: label || " ", align: "left" })),
    );
    form.setValue(`${base}.rows`, parsed.slice(1));
  };
  return (
    <Field
      label={field.label}
      required={field.required}
      error={error ?? form.errors[`${base}.columns`] ?? form.errors[`${base}.rows`]}
      description={field.help}
    >
      {(control) => (
        <>
          <Textarea
            {...control}
            rows={8}
            value={text}
            onChange={(event) => onChange(event.target.value)}
            className="font-mono text-sm"
            spellCheck={false}
            placeholder={"Model,AUC,KS\nLogistic regression,0.78,0.41"}
          />
          {columns.length ? (
            <p className="text-xs text-ink-3">
              {columns.length} columns × {rows.length} rows
            </p>
          ) : null}
        </>
      )}
    </Field>
  );
}

import Image from "next/image";
import { FileDown } from "lucide-react";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import r from "highlight.js/lib/languages/r";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";
import { parseVideoUrl, type Block, type BlockOf, type MediaDTO } from "@portfolio/shared";
import { Chart } from "@/components/charts/chart";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { Markdown } from "./markdown";

hljs.registerLanguage("python", python);
hljs.registerLanguage("r", r);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);

type MediaMap = Record<string, MediaDTO>;

/** Figure numbers are assigned in reading order across a whole page. */
export function numberFigures(groups: Block[][]): Map<string, number> {
  const numbers = new Map<string, number>();
  let next = 1;
  for (const blocks of groups) {
    for (const block of blocks) {
      if (["image", "gallery", "chart", "table", "video", "embed"].includes(block.type)) numbers.set(block.id, next++);
    }
  }
  return numbers;
}

function Caption({ number, children }: { number?: number; children?: React.ReactNode }) {
  if (!number && !children) return null;
  return (
    <figcaption className="mt-3 flex gap-3 text-sm text-ink-2">
      {number ? <span className="label shrink-0 pt-0.5">Fig. {number}</span> : null}
      {children ? <span>{children}</span> : null}
    </figcaption>
  );
}

function FigureImage({ media, alt, sizes, priority = false }: { media: MediaDTO; alt: string; sizes: string; priority?: boolean }) {
  if (!media.width || !media.height) return null;
  return (
    <Image
      src={media.url}
      alt={alt}
      width={media.width}
      height={media.height}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className="h-auto w-full rounded-xs border border-rule bg-muted"
    />
  );
}

function ImageBlock({ block, media, number }: { block: BlockOf<"image">; media: MediaMap; number?: number }) {
  const item = media[block.data.mediaId];
  if (!item) return null;
  const widthClass = block.data.width === "full" ? "lg:-mx-24" : block.data.width === "wide" ? "lg:-mx-12" : "";
  return (
    <figure className={cn("reveal", widthClass)}>
      <FigureImage media={item} alt={block.data.alt || item.alt} sizes="(min-width: 1024px) 760px, 100vw" />
      <Caption number={number}>{block.data.caption ?? item.caption}</Caption>
    </figure>
  );
}

function GalleryBlock({ block, media, number }: { block: BlockOf<"gallery">; media: MediaMap; number?: number }) {
  const items = block.data.items.map((entry) => ({ entry, media: media[entry.mediaId] })).filter((item) => item.media);
  if (items.length === 0) return null;
  return (
    <figure className="reveal">
      <ul className={cn("grid grid-cols-1 gap-3", block.data.columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {items.map(({ entry, media: item }) => (
          <li key={entry.mediaId} className="space-y-1.5">
            <FigureImage media={item!} alt={item!.alt} sizes="(min-width: 640px) 380px, 100vw" />
            {entry.caption ? <p className="text-sm text-ink-3">{entry.caption}</p> : null}
          </li>
        ))}
      </ul>
      <Caption number={number} />
    </figure>
  );
}

function TableBlock({ block, number }: { block: BlockOf<"table">; number?: number }) {
  const { columns, rows, caption, note } = block.data;
  const numeric = columns.map((_, index) => rows.length > 0 && rows.every((row) => /^[-+]?[\d.,%]+$/.test((row[index] ?? "").trim()) || !row[index]));
  return (
    <figure className="reveal">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={caption ?? "Table"}>
        <table className="w-full border-y-2 border-ink text-sm tabular-nums">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-ink">
              {columns.map((column, index) => (
                <th
                  key={column.label}
                  scope="col"
                  className={cn("py-2 pr-4 font-semibold", numeric[index] || column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-rule">
                {row.map((cell, index) => (
                  <td key={index} className={cn("py-1.5 pr-4", numeric[index] ? "text-right font-mono text-xs" : "text-left")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caption number={number}>
        {caption}
        {note ? <span className="block text-ink-3">{note}</span> : null}
      </Caption>
    </figure>
  );
}

function MetricBlock({ block }: { block: BlockOf<"metric"> }) {
  return (
    <dl className="reveal grid grid-cols-2 border-y border-rule sm:grid-cols-3">
      {block.data.items.map((item) => (
        <div key={item.label} className="border-rule py-4 pr-4 [&:not(:first-child)]:border-l [&:not(:first-child)]:pl-4">
          <dt className="label">{item.label}</dt>
          <dd className="mt-1 font-serif text-3xl tabular-nums text-ink">
            {item.value}
            {item.unit ? <span className="ml-1 text-lg text-ink-2">{item.unit}</span> : null}
          </dd>
          {item.context ? <dd className="mt-1 text-sm text-ink-3">{item.context}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

function CodeBlock({ block }: { block: BlockOf<"code"> }) {
  const { code, language, caption } = block.data;
  let html: string | null = null;
  if (language !== "text" && hljs.getLanguage(language)) {
    html = hljs.highlight(code, { language, ignoreIllegals: true }).value;
  }
  return (
    <figure className="reveal">
      <div className="flex items-center justify-between border-t-2 border-ink bg-muted px-4 py-2">
        <span className="label">{language}</span>
        {caption ? <span className="font-mono text-xs text-ink-3">{caption}</span> : null}
      </div>
      <pre className="overflow-x-auto bg-surface px-4 py-3 font-mono text-sm leading-relaxed text-ink" tabIndex={0}>
        {/* highlight.js output is escaped HTML built from the code string. */}
        {html ? <code dangerouslySetInnerHTML={{ __html: html }} /> : <code>{code}</code>}
      </pre>
    </figure>
  );
}

function CalloutBlock({ block }: { block: BlockOf<"callout"> }) {
  const tone = {
    note: { border: "border-info", label: "Note" },
    insight: { border: "border-primary", label: "Insight" },
    warning: { border: "border-accent-mark", label: "Caveat" },
  }[block.data.tone];
  return (
    <aside className={cn("reveal max-w-measure border-l-2 bg-surface py-3 pr-4 pl-5", tone.border)}>
      <p className="label">{block.data.title ?? tone.label}</p>
      <Markdown source={block.data.markdown} className="prose-ui mt-1 text-ink-2" />
    </aside>
  );
}

function MethodologyBlock({ block }: { block: BlockOf<"methodology"> }) {
  return (
    <section className="reveal" aria-label={block.data.title ?? "Methodology"}>
      {block.data.title ? <p className="label mb-3">{block.data.title}</p> : null}
      <ol className="relative space-y-5 border-l border-rule-strong pl-6">
        {block.data.steps.map((step, index) => (
          <li key={`${step.title}-${index}`} className="relative">
            <span aria-hidden className="absolute top-1.5 -left-6 size-2.5 -translate-x-1/2 rounded-full border-2 border-paper bg-primary" />
            <p className="font-mono text-xs text-ink-3">Step {index + 1}</p>
            <p className="font-serif text-lg text-ink">{step.title}</p>
            <Markdown source={step.description} className="prose-ui text-ink-2" />
          </li>
        ))}
      </ol>
    </section>
  );
}

function VideoBlock({ block, media, number }: { block: BlockOf<"video">; media: MediaMap; number?: number }) {
  if (block.data.source === "upload") {
    const file = block.data.mediaId ? media[block.data.mediaId] : undefined;
    if (!file) return null;
    return (
      <figure className="reveal">
        <video controls preload="metadata" className="w-full rounded-xs border border-rule bg-muted" aria-label={block.data.title}>
          <source src={file.url} type={file.mimeType} />
        </video>
        <Caption number={number}>{block.data.caption ?? block.data.title}</Caption>
      </figure>
    );
  }
  const parsed = block.data.url ? parseVideoUrl(block.data.url) : null;
  if (!parsed) return null;
  return (
    <figure className="reveal">
      <div className="aspect-video overflow-hidden rounded-xs border border-rule bg-muted">
        <iframe
          src={parsed.embedUrl}
          title={block.data.title}
          loading="lazy"
          allow="encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          className="size-full"
        />
      </div>
      <Caption number={number}>{block.data.caption ?? block.data.title}</Caption>
    </figure>
  );
}

function EmbedBlock({ block, number }: { block: BlockOf<"embed">; number?: number }) {
  return (
    <figure className="reveal">
      <div className="overflow-hidden rounded-xs border border-rule bg-muted" style={{ height: block.data.height }}>
        <iframe
          src={block.data.url}
          title={block.data.title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          className="size-full"
        />
      </div>
      <Caption number={number}>
        {block.data.caption ?? block.data.title}{" "}
        <a href={block.data.url} target="_blank" rel="noopener noreferrer" className="link">
          Open in a new tab<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </Caption>
    </figure>
  );
}

function FileBlock({ block, media }: { block: BlockOf<"file">; media: MediaMap }) {
  const file = media[block.data.mediaId];
  if (!file) return null;
  return (
    <p className="reveal">
      <a
        href={file.url}
        className="group inline-flex items-start gap-3 rounded-sm border border-rule px-4 py-3 transition-colors hover:border-ink-3 hover:bg-surface"
      >
        <Icon icon={FileDown} size={20} className="mt-0.5 shrink-0 text-primary" />
        <span>
          <span className="block font-medium text-ink group-hover:underline">{block.data.label ?? file.title ?? file.fileName}</span>
          <span className="block text-sm text-ink-3">
            {block.data.description ? `${block.data.description} · ` : ""}
            {file.mimeType === "application/pdf" ? "PDF" : file.mimeType} · {Math.max(1, Math.round(file.sizeBytes / 1024))} KB
          </span>
        </span>
      </a>
    </p>
  );
}

export function BlockView({
  block,
  media,
  figureNumbers,
  headingBase = 3,
}: {
  block: Block;
  media: MediaMap;
  figureNumbers: Map<string, number>;
  headingBase?: number;
}) {
  const number = figureNumbers.get(block.id);
  switch (block.type) {
    case "paragraph":
      return <Markdown source={block.data.markdown} headingBase={headingBase + 1} />;
    case "heading": {
      const level = Math.min(6, headingBase + block.data.level - 2);
      const Tag = `h${level}` as "h3";
      // Size follows the rendered level, so a post's h2 outranks a case study's h3.
      const size = level <= 2 ? "text-3xl pt-4" : level === 3 ? "text-2xl pt-2" : "text-xl";
      return <Tag className={cn("max-w-measure font-serif text-ink", size)}>{block.data.text}</Tag>;
    }
    case "image":
      return <ImageBlock block={block} media={media} number={number} />;
    case "gallery":
      return <GalleryBlock block={block} media={media} number={number} />;
    case "quote":
      return (
        <blockquote className="reveal max-w-measure border-l-2 border-secondary pl-5">
          <p className="font-serif-italic text-2xl leading-snug text-ink italic">“{block.data.text}”</p>
          {block.data.attribution || block.data.source ? (
            <footer className="mt-2 text-sm text-ink-3">
              — {block.data.attribution}
              {block.data.source ? <cite className="not-italic">, {block.data.source}</cite> : null}
            </footer>
          ) : null}
        </blockquote>
      );
    case "code":
      return <CodeBlock block={block} />;
    case "table":
      return <TableBlock block={block} number={number} />;
    case "metric":
      return <MetricBlock block={block} />;
    case "chart":
      return (
        <div className="reveal">
          <Chart chart={block.data} figureNumber={number} />
        </div>
      );
    case "callout":
      return <CalloutBlock block={block} />;
    case "methodology":
      return <MethodologyBlock block={block} />;
    case "video":
      return <VideoBlock block={block} media={media} number={number} />;
    case "embed":
      return <EmbedBlock block={block} number={number} />;
    case "file":
      return <FileBlock block={block} media={media} />;
    case "divider":
      return <hr className="max-w-measure border-rule" />;
    default:
      // Unknown (newer) block types are skipped so stored content stays forward compatible.
      return null;
  }
}

export function Blocks({
  blocks,
  media,
  figureNumbers,
  headingBase = 3,
  className,
}: {
  blocks: Block[];
  media: MediaMap;
  figureNumbers?: Map<string, number>;
  headingBase?: number;
  className?: string;
}) {
  const numbers = figureNumbers ?? numberFigures([blocks]);
  return (
    <div className={cn("space-y-(--space-block)", className)}>
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} media={media} figureNumbers={numbers} headingBase={headingBase} />
      ))}
    </div>
  );
}

import { z } from "zod";
import { emptyToNull, httpUrl, nullableText, uuid } from "../schemas/common";
import { isAllowedEmbedUrl, parseVideoUrl } from "./embeds";
import type { FieldDef } from "./fields";

/**
 * Content block system shared by projects, research and blog posts.
 *
 * A block is `{ id, type, data }`. To add a block type:
 *   1. add its data schema and definition here (schema + editor fields),
 *   2. add a renderer in apps/web/src/components/content/blocks.
 * Renderers ignore unknown types, so stored content stays forward compatible.
 */

export const CODE_LANGUAGES = [
  "python",
  "r",
  "sql",
  "bash",
  "json",
  "yaml",
  "typescript",
  "javascript",
  "text",
] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const CHART_TYPES = ["line", "bar", "scatter", "area"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

const optional = (max: number, label?: string) => nullableText(max, label);

const headingData = z.object({
  level: z.coerce.number().int().min(2).max(4).default(3),
  text: z.string().trim().min(1, { error: "Heading text is required" }).max(200),
});

const paragraphData = z.object({
  markdown: z.string().trim().min(1, { error: "Paragraph is empty" }).max(20_000),
});

const imageData = z.object({
  mediaId: uuid,
  alt: optional(300, "Alt text"),
  caption: optional(500, "Caption"),
  width: z.enum(["text", "wide", "full"]).default("text"),
});

const galleryData = z.object({
  items: z
    .array(z.object({ mediaId: uuid, caption: optional(300, "Caption") }))
    .min(1, { error: "Add at least one image" })
    .max(24),
  columns: z.coerce.number().int().min(2).max(3).default(2),
});

const quoteData = z.object({
  text: z.string().trim().min(1, { error: "Quote text is required" }).max(2000),
  attribution: optional(200, "Attribution"),
  source: optional(300, "Source"),
});

const codeData = z.object({
  language: z.enum(CODE_LANGUAGES).default("python"),
  code: z.string().min(1, { error: "Code is empty" }).max(20_000),
  caption: optional(300, "Caption"),
});

const tableData = z
  .object({
    caption: optional(300, "Caption"),
    columns: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(100),
          align: z.enum(["left", "center", "right"]).default("left"),
        }),
      )
      .min(1)
      .max(12),
    rows: z.array(z.array(z.string().max(500))).max(200),
    note: optional(500, "Note"),
  })
  .refine((table) => table.rows.every((row) => row.length === table.columns.length), {
    error: "Every row must have one cell per column",
    path: ["rows"],
  });

const metricItem = z.object({
  label: z.string().trim().min(1, { error: "Metric label is required" }).max(80),
  value: z.string().trim().min(1, { error: "Metric value is required" }).max(40),
  unit: optional(20, "Unit"),
  context: optional(200, "Context"),
});

const metricData = z.object({
  items: z.array(metricItem).min(1).max(8),
});

const chartValue = z.union([z.number().finite(), z.null()]);

const chartData = z
  .object({
    chartType: z.enum(CHART_TYPES).default("line"),
    title: z.string().trim().min(1, { error: "Chart title is required" }).max(200),
    description: z
      .string()
      .trim()
      .min(1, { error: "Describe what the chart shows (used as its text alternative)" })
      .max(1000),
    xLabel: optional(80, "X axis label"),
    yLabel: optional(80, "Y axis label"),
    yFormat: z.enum(["number", "percent"]).default("number"),
    referenceLine: z.enum(["none", "diagonal"]).default("none"),
    source: optional(300, "Source"),
    data: z.object({
      x: z.array(z.union([z.string().max(60), z.number().finite()])).min(1).max(500),
      series: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(60),
            values: z.array(chartValue).max(500),
          }),
        )
        .min(1)
        .max(6),
    }),
  })
  .refine((chart) => chart.data.series.every((s) => s.values.length === chart.data.x.length), {
    error: "Every series needs one value per x value",
    path: ["data"],
  })
  .refine(
    (chart) =>
      chart.chartType !== "scatter" || chart.data.x.every((value) => typeof value === "number"),
    { error: "Scatter charts need numeric x values", path: ["data"] },
  );

const calloutData = z.object({
  tone: z.enum(["note", "insight", "warning"]).default("note"),
  title: optional(120, "Title"),
  markdown: z.string().trim().min(1, { error: "Callout text is required" }).max(5000),
});

const videoData = z
  .object({
    source: z.enum(["youtube", "vimeo", "upload"]).default("youtube"),
    url: z.preprocess(emptyToNull, httpUrl.nullable()),
    mediaId: z.preprocess(emptyToNull, uuid.nullable()),
    title: z.string().trim().min(1, { error: "Video title is required" }).max(200),
    caption: optional(300, "Caption"),
  })
  .superRefine((video, ctx) => {
    if (video.source === "upload") {
      if (!video.mediaId)
        ctx.addIssue({ code: "custom", message: "Choose a video file", path: ["mediaId"] });
      return;
    }
    const parsed = video.url ? parseVideoUrl(video.url) : null;
    if (!parsed || parsed.provider !== video.source) {
      ctx.addIssue({
        code: "custom",
        message: `Enter a valid ${video.source === "youtube" ? "YouTube" : "Vimeo"} URL`,
        path: ["url"],
      });
    }
  });

const embedData = z.object({
  url: httpUrl.refine(isAllowedEmbedUrl, {
    error: "This host cannot be embedded. See docs/content-model.md for allowed hosts.",
  }),
  title: z.string().trim().min(1, { error: "Embed title is required" }).max(200),
  height: z.coerce.number().int().min(240).max(1200).default(480),
  caption: optional(300, "Caption"),
});

const fileData = z.object({
  mediaId: uuid,
  label: optional(120, "Label"),
  description: optional(300, "Description"),
});

const methodologyData = z.object({
  title: optional(120, "Title"),
  steps: z
    .array(
      z.object({
        title: z.string().trim().min(1, { error: "Step title is required" }).max(80),
        description: z.preprocess(
          (value) => (value === undefined || value === null ? "" : value),
          z.string().trim().max(2000),
        ),
      }),
    )
    .min(1)
    .max(12),
});

const dividerData = z.object({});

const blockId = z.string().trim().min(1).max(40);

const block = <T extends string, S extends z.ZodType>(type: T, data: S) =>
  z.object({ id: blockId, type: z.literal(type), data });

export const blockSchema = z.discriminatedUnion("type", [
  block("heading", headingData),
  block("paragraph", paragraphData),
  block("image", imageData),
  block("gallery", galleryData),
  block("quote", quoteData),
  block("code", codeData),
  block("table", tableData),
  block("metric", metricData),
  block("chart", chartData),
  block("callout", calloutData),
  block("video", videoData),
  block("embed", embedData),
  block("file", fileData),
  block("methodology", methodologyData),
  block("divider", dividerData),
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockInput = z.input<typeof blockSchema>;
export type BlockType = Block["type"];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;
export type ChartBlockData = BlockOf<"chart">["data"];
export type TableBlockData = BlockOf<"table">["data"];

export const blocksSchema = z.array(blockSchema).max(200, { error: "Too many blocks" });

export const BLOCK_TYPES = [
  "paragraph",
  "heading",
  "image",
  "gallery",
  "chart",
  "metric",
  "table",
  "code",
  "quote",
  "callout",
  "methodology",
  "video",
  "embed",
  "file",
  "divider",
] as const satisfies readonly BlockType[];

export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  /** Lucide icon name used in the admin block picker. */
  icon: string;
  fields: readonly FieldDef[];
  /** Initial data for a newly inserted block. */
  initial: () => Record<string, unknown>;
}

const captionField: FieldDef = { name: "caption", label: "Caption", kind: "text", maxLength: 300 };

export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
  paragraph: {
    type: "paragraph",
    label: "Text",
    description: "Paragraphs, lists and links (Markdown).",
    icon: "pilcrow",
    fields: [{ name: "markdown", label: "Text", kind: "markdown", required: true, rows: 6 }],
    initial: () => ({ markdown: "" }),
  },
  heading: {
    type: "heading",
    label: "Heading",
    description: "A sub-heading inside the section.",
    icon: "heading",
    fields: [
      { name: "text", label: "Heading", kind: "text", required: true, maxLength: 200 },
      {
        name: "level",
        label: "Level",
        kind: "select",
        options: [
          { value: 2, label: "Large" },
          { value: 3, label: "Medium" },
          { value: 4, label: "Small" },
        ],
      },
    ],
    initial: () => ({ text: "", level: 3 }),
  },
  image: {
    type: "image",
    label: "Image",
    description: "A single figure with caption.",
    icon: "image",
    fields: [
      { name: "mediaId", label: "Image", kind: "media", accept: "image", required: true },
      {
        name: "alt",
        label: "Alt text override",
        kind: "text",
        maxLength: 300,
        help: "Leave empty to use the alt text stored with the image.",
      },
      captionField,
      {
        name: "width",
        label: "Width",
        kind: "select",
        options: [
          { value: "text", label: "Text column" },
          { value: "wide", label: "Wide" },
          { value: "full", label: "Full width" },
        ],
      },
    ],
    initial: () => ({ mediaId: "", alt: "", caption: "", width: "text" }),
  },
  gallery: {
    type: "gallery",
    label: "Gallery",
    description: "Several images in a grid.",
    icon: "images",
    fields: [
      {
        name: "items",
        label: "Images",
        kind: "repeater",
        maxItems: 24,
        fields: [
          { name: "mediaId", label: "Image", kind: "media", accept: "image", required: true },
          captionField,
        ],
      },
      {
        name: "columns",
        label: "Columns",
        kind: "select",
        options: [
          { value: 2, label: "Two" },
          { value: 3, label: "Three" },
        ],
      },
    ],
    initial: () => ({ items: [], columns: 2 }),
  },
  chart: {
    type: "chart",
    label: "Chart",
    description: "Line, bar, area or scatter chart from CSV data.",
    icon: "chart-line",
    fields: [
      { name: "title", label: "Title", kind: "text", required: true, maxLength: 200 },
      {
        name: "description",
        label: "What the chart shows",
        kind: "textarea",
        required: true,
        rows: 3,
        help: "One or two sentences read by screen readers and shown under the chart.",
      },
      {
        name: "chartType",
        label: "Chart type",
        kind: "select",
        options: [
          { value: "line", label: "Line" },
          { value: "area", label: "Area" },
          { value: "bar", label: "Bar" },
          { value: "scatter", label: "Scatter" },
        ],
      },
      {
        name: "data",
        label: "Data (CSV)",
        kind: "chart-data",
        required: true,
        help: "First column is x; each further column is a series. First row holds the names.",
      },
      { name: "xLabel", label: "X axis label", kind: "text", maxLength: 80 },
      { name: "yLabel", label: "Y axis label", kind: "text", maxLength: 80 },
      {
        name: "yFormat",
        label: "Y values",
        kind: "select",
        options: [
          { value: "number", label: "Numbers" },
          { value: "percent", label: "Percentages (0–1)" },
        ],
      },
      {
        name: "referenceLine",
        label: "Reference line",
        kind: "select",
        options: [
          { value: "none", label: "None" },
          { value: "diagonal", label: "Diagonal (e.g. ROC chance line)" },
        ],
      },
      { name: "source", label: "Source note", kind: "text", maxLength: 300 },
    ],
    initial: () => ({
      title: "",
      description: "",
      chartType: "line",
      data: { x: [], series: [] },
      xLabel: "",
      yLabel: "",
      yFormat: "number",
      referenceLine: "none",
      source: "",
    }),
  },
  metric: {
    type: "metric",
    label: "Metrics",
    description: "Headline numbers with context (use real, verifiable values only).",
    icon: "gauge",
    fields: [
      {
        name: "items",
        label: "Metrics",
        kind: "repeater",
        maxItems: 8,
        fields: [
          { name: "label", label: "Label", kind: "text", required: true, maxLength: 80 },
          { name: "value", label: "Value", kind: "text", required: true, maxLength: 40 },
          { name: "unit", label: "Unit", kind: "text", maxLength: 20 },
          { name: "context", label: "Context", kind: "text", maxLength: 200 },
        ],
      },
    ],
    initial: () => ({ items: [] }),
  },
  table: {
    type: "table",
    label: "Table",
    description: "Tabular results (paste CSV).",
    icon: "table",
    fields: [
      captionField,
      {
        name: "table",
        label: "Table (CSV)",
        kind: "table-data",
        required: true,
        help: "First row is the header. Numeric columns are right-aligned automatically.",
      },
      { name: "note", label: "Note", kind: "text", maxLength: 500 },
    ],
    initial: () => ({ caption: "", columns: [], rows: [], note: "" }),
  },
  code: {
    type: "code",
    label: "Code",
    description: "A code listing with syntax highlighting.",
    icon: "code",
    fields: [
      {
        name: "language",
        label: "Language",
        kind: "select",
        options: CODE_LANGUAGES.map((value) => ({ value, label: value.toUpperCase() })),
      },
      { name: "code", label: "Code", kind: "code", required: true, rows: 10 },
      captionField,
    ],
    initial: () => ({ language: "python", code: "", caption: "" }),
  },
  quote: {
    type: "quote",
    label: "Quote",
    description: "A pull quote or cited passage.",
    icon: "quote",
    fields: [
      { name: "text", label: "Quote", kind: "textarea", required: true, rows: 3 },
      { name: "attribution", label: "Attribution", kind: "text", maxLength: 200 },
      { name: "source", label: "Source", kind: "text", maxLength: 300 },
    ],
    initial: () => ({ text: "", attribution: "", source: "" }),
  },
  callout: {
    type: "callout",
    label: "Callout",
    description: "A highlighted note, insight or caveat.",
    icon: "message-square-quote",
    fields: [
      {
        name: "tone",
        label: "Tone",
        kind: "select",
        options: [
          { value: "note", label: "Note" },
          { value: "insight", label: "Insight" },
          { value: "warning", label: "Caveat" },
        ],
      },
      { name: "title", label: "Title", kind: "text", maxLength: 120 },
      { name: "markdown", label: "Text", kind: "markdown", required: true, rows: 4 },
    ],
    initial: () => ({ tone: "note", title: "", markdown: "" }),
  },
  methodology: {
    type: "methodology",
    label: "Methodology steps",
    description: "An analytical workflow shown as numbered steps.",
    icon: "workflow",
    fields: [
      { name: "title", label: "Title", kind: "text", maxLength: 120 },
      {
        name: "steps",
        label: "Steps",
        kind: "repeater",
        maxItems: 12,
        fields: [
          { name: "title", label: "Step", kind: "text", required: true, maxLength: 80 },
          { name: "description", label: "Description", kind: "markdown", rows: 3 },
        ],
      },
    ],
    initial: () => ({ title: "", steps: [] }),
  },
  video: {
    type: "video",
    label: "Video",
    description: "YouTube, Vimeo or an uploaded video.",
    icon: "video",
    fields: [
      {
        name: "source",
        label: "Source",
        kind: "select",
        options: [
          { value: "youtube", label: "YouTube" },
          { value: "vimeo", label: "Vimeo" },
          { value: "upload", label: "Uploaded file" },
        ],
      },
      {
        name: "url",
        label: "Video URL",
        kind: "url",
        showWhen: { field: "source", equals: ["youtube", "vimeo"] },
      },
      {
        name: "mediaId",
        label: "Video file",
        kind: "media",
        accept: "video",
        showWhen: { field: "source", equals: ["upload"] },
      },
      { name: "title", label: "Title", kind: "text", required: true, maxLength: 200 },
      captionField,
    ],
    initial: () => ({ source: "youtube", url: "", mediaId: "", title: "", caption: "" }),
  },
  embed: {
    type: "embed",
    label: "Embed",
    description: "Interactive dashboard or app from an allowed host (Tableau, Power BI, Shiny…).",
    icon: "app-window",
    fields: [
      { name: "url", label: "Embed URL", kind: "url", required: true },
      { name: "title", label: "Title", kind: "text", required: true, maxLength: 200 },
      { name: "height", label: "Height (px)", kind: "number", min: 240, max: 1200 },
      captionField,
    ],
    initial: () => ({ url: "", title: "", height: 480, caption: "" }),
  },
  file: {
    type: "file",
    label: "File",
    description: "A downloadable document (PDF).",
    icon: "file-down",
    fields: [
      { name: "mediaId", label: "File", kind: "media", accept: "document", required: true },
      { name: "label", label: "Link label", kind: "text", maxLength: 120 },
      { name: "description", label: "Description", kind: "text", maxLength: 300 },
    ],
    initial: () => ({ mediaId: "", label: "", description: "" }),
  },
  divider: {
    type: "divider",
    label: "Divider",
    description: "A thin rule between passages.",
    icon: "minus",
    fields: [],
    initial: () => ({}),
  },
};

/** Collects every media id referenced by a list of blocks (for usage tracking and hydration). */
export function collectBlockMediaIds(blocks: readonly Block[]): string[] {
  const ids = new Set<string>();
  for (const item of blocks) {
    switch (item.type) {
      case "image":
      case "file":
        ids.add(item.data.mediaId);
        break;
      case "gallery":
        for (const entry of item.data.items) ids.add(entry.mediaId);
        break;
      case "video":
        if (item.data.mediaId) ids.add(item.data.mediaId);
        break;
      default:
        break;
    }
  }
  return [...ids];
}

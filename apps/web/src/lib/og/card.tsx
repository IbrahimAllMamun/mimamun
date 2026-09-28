import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { truncate } from "@portfolio/shared";

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Light-theme palette (tokens.css) — social cards are always light. */
const COLORS = {
  paper: "#f4f2ec",
  surface: "#faf9f5",
  ink: "#17201b",
  ink2: "#3d4842",
  ink3: "#5c655f",
  rule: "#d6d2c6",
  primary: "#1f5a44",
  secondary: "#5a3a6e",
  accent: "#c25a24",
} as const;

export type CardTone = "primary" | "secondary" | "accent";

const fontDir = path.join(process.cwd(), "src/fonts/og");
let fontsPromise: Promise<
  { name: string; data: Buffer; weight: 400 | 500; style: "normal" }[]
> | null = null;

function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(path.join(fontDir, "newsreader-latin-500-normal.woff")),
    readFile(path.join(fontDir, "ibm-plex-sans-latin-400-normal.woff")),
    readFile(path.join(fontDir, "ibm-plex-mono-latin-500-normal.woff")),
  ]).then(([serif, sans, mono]) => [
    { name: "Newsreader", data: serif, weight: 500, style: "normal" },
    { name: "Plex Sans", data: sans, weight: 400, style: "normal" },
    { name: "Plex Mono", data: mono, weight: 500, style: "normal" },
  ]);
  return fontsPromise;
}

export interface CardInput {
  eyebrow: string;
  title: string;
  description?: string | null;
  author: string;
  role?: string | null;
  host: string;
  tone?: CardTone;
}

/**
 * A 1200×630 social card in the site's "working paper" style: a margin label,
 * a heavy rule, the title in Newsreader and a colour-coded marker for the
 * content type (green work, purple research, orange writing).
 */
export async function renderCard(input: CardInput, init?: { headers?: Record<string, string> }) {
  const tone = COLORS[input.tone ?? "primary"];
  const title = truncate(input.title, 140);
  const titleSize = title.length > 90 ? 54 : title.length > 70 ? 60 : title.length > 40 ? 70 : 84;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.paper,
        padding: "64px 72px",
        fontFamily: "Plex Sans",
        color: COLORS.ink,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{ width: 14, height: 14, backgroundColor: tone, transform: "rotate(45deg)" }}
          />
          <span
            style={{
              fontFamily: "Plex Mono",
              fontSize: 22,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: COLORS.ink3,
            }}
          >
            {truncate(input.eyebrow, 60)}
          </span>
        </div>
        {input.host ? (
          <span style={{ fontFamily: "Plex Mono", fontSize: 22, color: COLORS.ink3 }}>
            {input.host}
          </span>
        ) : null}
      </div>
      <div style={{ height: 4, backgroundColor: COLORS.ink, marginTop: 28 }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            fontFamily: "Newsreader",
            fontSize: titleSize,
            lineHeight: 1.05,
            letterSpacing: -1,
            color: COLORS.ink,
          }}
        >
          {title}
        </div>
        {input.description ? (
          <div style={{ fontSize: 28, lineHeight: 1.4, color: COLORS.ink2, maxWidth: 960 }}>
            {truncate(input.description, 170)}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${COLORS.rule}`,
          paddingTop: 24,
        }}
      >
        <span style={{ fontFamily: "Newsreader", fontSize: 32 }}>{input.author}</span>
        {input.role ? (
          <span
            style={{
              fontFamily: "Plex Mono",
              fontSize: 20,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: tone,
            }}
          >
            {input.role}
          </span>
        ) : null}
      </div>
    </div>,
    { ...OG_SIZE, fonts: await loadFonts(), headers: init?.headers },
  );
}

/** Square monogram for favicons and the Apple touch icon. */
export async function renderMonogram(size: number) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        color: COLORS.paper,
        fontFamily: "Newsreader",
        fontSize: Math.round(size * 0.56),
        letterSpacing: -Math.round(size * 0.02),
        borderRadius: Math.round(size * 0.12),
      }}
    >
      IA
    </div>,
    { width: size, height: size, fonts: await loadFonts() },
  );
}

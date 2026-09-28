/**
 * Small, dependency-free chart math used by the SVG chart components and the
 * admin chart editor (CSV parsing). Kept framework-agnostic so it is unit tested.
 */

export interface Ticks {
  min: number;
  max: number;
  step: number;
  values: number[];
}

/** Heckbert's "nice number" for axis ranges. */
export function niceNumber(range: number, round: boolean): number {
  if (range <= 0 || !Number.isFinite(range)) return 1;
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let nice: number;
  if (round) {
    if (fraction < 1.5) nice = 1;
    else if (fraction < 3) nice = 2;
    else if (fraction < 7) nice = 5;
    else nice = 10;
  } else if (fraction <= 1) nice = 1;
  else if (fraction <= 2) nice = 2;
  else if (fraction <= 5) nice = 5;
  else nice = 10;
  return nice * 10 ** exponent;
}

function roundTo(value: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  return Number(value.toFixed(Math.min(decimals, 12)));
}

/**
 * Round tick values spanning [min, max]. With `integer`, steps never fall
 * below 1, so counts are not labelled 0.2, 0.4…
 */
export function niceTicks(
  min: number,
  max: number,
  maxTicks = 5,
  { integer = false }: { integer?: boolean } = {},
): Ticks {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1, step: 0.25, values: [0, 0.25, 0.5, 0.75, 1] };
  }
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.1;
    min -= pad;
    max += pad;
  }
  if (min > max) [min, max] = [max, min];
  const range = niceNumber(max - min, false);
  const rawStep = niceNumber(range / Math.max(1, maxTicks - 1), true);
  const step = integer ? Math.max(1, Math.round(rawStep)) : rawStep;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const values: number[] = [];
  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
    values.push(roundTo(value, step));
  }
  return { min: roundTo(niceMin, step), max: roundTo(niceMax, step), step, values };
}

export type Scale = (value: number) => number;

export function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value) => r0 + ((value - d0) / span) * (r1 - r0);
}

export function extent(values: readonly (number | null | undefined)[]): [number, number] | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return min === Number.POSITIVE_INFINITY ? null : [min, max];
}

export function formatNumber(value: number, format: "number" | "percent" = "number"): string {
  if (format === "percent") {
    const percent = value * 100;
    return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
  }
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${(value / 1000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  if (Number.isInteger(value)) return value.toLocaleString("en-GB");
  return Number(value.toPrecision(4)).toString();
}

export interface ChartSeriesData {
  x: (string | number)[];
  series: { name: string; values: (number | null)[] }[];
}

/** Splits one CSV line, honouring double-quoted cells. */
export function parseCsvLine(line: string, delimiter = ","): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else current += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(headerLine: string): string {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes(";") && !headerLine.includes(",")) return ";";
  return ",";
}

export function parseCsv(text: string): string[][] {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(lines[0] ?? "");
  return lines.map((line) => parseCsvLine(line, delimiter));
}

function toNumber(value: string): number | null {
  if (value === "" || value.toLowerCase() === "na" || value.toLowerCase() === "null") return null;
  const numeric = Number(value.replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Parses wide-format CSV (x column followed by one column per series).
 * Returns an error message instead of throwing so the editor can show it inline.
 */
export function parseChartCsv(text: string): { data: ChartSeriesData } | { error: string } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "Add a header row and at least one data row." };
  const header = rows[0] ?? [];
  if (header.length < 2) return { error: "Add at least one series column after the x column." };
  const body = rows.slice(1);
  const inconsistent = body.findIndex((row) => row.length !== header.length);
  if (inconsistent >= 0) {
    return {
      error: `Row ${inconsistent + 2} has ${body[inconsistent]?.length} cells; expected ${header.length}.`,
    };
  }
  const rawX = body.map((row) => row[0] ?? "");
  const numericX = rawX.every((value) => toNumber(value) !== null);
  const x = numericX ? rawX.map((value) => toNumber(value) as number) : rawX;
  const series = header.slice(1).map((name, index) => ({
    name: name || `Series ${index + 1}`,
    values: body.map((row) => toNumber(row[index + 1] ?? "")),
  }));
  return { data: { x, series } };
}

export function chartDataToCsv(data: ChartSeriesData, xLabel = "x"): string {
  const header = [xLabel || "x", ...data.series.map((series) => series.name)];
  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const lines = [header.map(escape).join(",")];
  data.x.forEach((xValue, row) => {
    const cells = [
      String(xValue),
      ...data.series.map((series) => {
        const value = series.values[row];
        return value === null || value === undefined ? "" : String(value);
      }),
    ];
    lines.push(cells.map(escape).join(","));
  });
  return lines.join("\n");
}

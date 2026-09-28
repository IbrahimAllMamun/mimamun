/**
 * Date helpers. Career, education, research and credential dates are stored
 * as `YYYY-MM-DD` (first of the month) and shown at month precision. All
 * formatting happens in UTC so a date never shifts by a day across timezones.
 */

const MONTH_FORMAT = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const LONG_MONTH_FORMAT = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const SHORT_DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Aug 2026" */
export function formatMonth(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  return date ? MONTH_FORMAT.format(date) : "";
}

/** "August 2026" */
export function formatMonthLong(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  return date ? LONG_MONTH_FORMAT.format(date) : "";
}

/** "28 September 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  return date ? DAY_FORMAT.format(date) : "";
}

/** "28 Sept 2026" */
export function formatShortDate(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  return date ? SHORT_DAY_FORMAT.format(date) : "";
}

export function yearOf(value: string | Date | null | undefined): number | null {
  const date = parseDate(value);
  return date ? date.getUTCFullYear() : null;
}

/**
 * "Aug 2026 – Present", "Jan 2020 – Sep 2024", "Until Aug 2026" (unknown start).
 */
export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  isCurrent = false,
): string {
  const from = formatMonth(start);
  const to = isCurrent ? "Present" : formatMonth(end);
  if (from && to) return from === to ? from : `${from} – ${to}`;
  if (from) return isCurrent ? `${from} – Present` : from;
  if (to) return isCurrent ? "Present" : `Until ${to}`;
  return "";
}

/** Whole months between two month dates (inclusive of the start month). */
export function monthsBetween(start: string, end: string | Date): number {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return 0;
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) + 1;
}

/** "2 yrs 3 mos" style duration. */
export function formatDuration(months: number): string {
  if (months <= 0) return "";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years) parts.push(`${years} yr${years === 1 ? "" : "s"}`);
  if (rest) parts.push(`${rest} mo${rest === 1 ? "" : "s"}`);
  return parts.join(" ");
}

/** Converts a `YYYY-MM-DD` date to the `YYYY-MM` value used by `<input type="month">`. */
export function toMonthInput(value: string | null | undefined): string {
  return value ? value.slice(0, 7) : "";
}

export function isoDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

import { z } from "zod";

/**
 * Reusable schema primitives. Admin forms submit empty strings for blank
 * optional inputs; the helpers below normalise those to `null` so the API and
 * database never store meaningless empty strings.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function emptyToNull(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
}

export const uuid = z.uuid({ error: "Invalid identifier" });

export const requiredText = (max: number, label = "This field") =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, { error: `${label} is required` })
    .max(max, { error: `${label} must be at most ${max} characters` });

export const nullableText = (max: number, label = "This field") =>
  z.preprocess(
    emptyToNull,
    z.string().max(max, { error: `${label} must be at most ${max} characters` }).nullable(),
  );

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: "Slug is required" })
  .max(120, { error: "Slug must be at most 120 characters" })
  .regex(SLUG_PATTERN, { error: "Use lowercase letters, numbers and single hyphens" });

/** Optional slug: when null the API derives one from the title. */
export const optionalSlug = z.preprocess(emptyToNull, slug.nullable());

/** Only http(s) URLs are accepted, which rules out `javascript:` and `data:` links. */
export const httpUrl = z
  .url({ protocol: /^https?$/, error: "Enter a full URL starting with https:// or http://" })
  .max(2048, { error: "URL is too long" });

export const nullableUrl = z.preprocess(emptyToNull, httpUrl.nullable());

export const email = z
  .email({ error: "Enter a valid email address" })
  .max(254, { error: "Email is too long" });

export const nullableEmail = z.preprocess(emptyToNull, email.nullable());

/** Internal path (`/about`), full http(s) URL, or `mailto:` link — used for navigation. */
export const linkHref = z
  .string()
  .trim()
  .min(1, { error: "Link is required" })
  .max(2048, { error: "Link is too long" })
  .refine(
    (value) =>
      (value.startsWith("/") && !value.startsWith("//")) ||
      /^https?:\/\/[^\s]+$/i.test(value) ||
      /^mailto:[^\s@]+@[^\s@]+$/i.test(value),
    { error: "Use a path starting with /, a full https:// URL or a mailto: link" },
  );

const MONTH_DATE = /^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/;

/** Month-precision date. Accepts `YYYY-MM` or `YYYY-MM-DD`, stores `YYYY-MM-01`. */
export const monthDate = z
  .string()
  .trim()
  .regex(MONTH_DATE, { error: "Use the format YYYY-MM" })
  .transform((value) => `${value.slice(0, 7)}-01`);

export const nullableMonthDate = z.preprocess(emptyToNull, monthDate.nullable());

export const isoDate = z.iso.date({ error: "Use the format YYYY-MM-DD" });
export const nullableIsoDate = z.preprocess(emptyToNull, isoDate.nullable());

export const nullableDateTime = z.preprocess(
  emptyToNull,
  z.iso.datetime({ offset: true, error: "Enter a valid date and time" }).nullable(),
);

/** Trimmed, de-duplicated list of short strings; blank entries are dropped. */
export const stringList = (maxItems: number, maxLength: number, label = "Item") =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) return [];
      if (!Array.isArray(value)) return value;
      return value
        .map((item) => (typeof item === "string" ? item.trim() : item))
        .filter((item) => item !== "");
    },
    z
      .array(z.string().max(maxLength, { error: `${label} must be at most ${maxLength} characters` }))
      .max(maxItems, { error: `At most ${maxItems} entries` })
      .transform((items) => [...new Set(items)]),
  );

export const idList = (maxItems = 200) =>
  z.preprocess(
    (value) => (value === undefined || value === null ? [] : value),
    z
      .array(uuid)
      .max(maxItems)
      .transform((ids) => [...new Set(ids)]),
  );

export const displayOrder = z.coerce.number().int().min(0).max(100_000).default(0);

export const booleanDefault = (fallback: boolean) => z.boolean().default(fallback);

/** Query-string boolean (`?featured=true`). */
export const queryBoolean = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchQuery = z.preprocess(emptyToNull, z.string().max(200).nullable());

export const reorderInput = z.object({
  ids: z.array(uuid).min(1).max(500),
});
export type ReorderInput = z.infer<typeof reorderInput>;

export const bulkInput = z.object({
  ids: z.array(uuid).min(1).max(200),
  action: z.enum(["publish", "unpublish", "archive", "feature", "unfeature", "show", "hide", "delete"]),
});
export type BulkInput = z.infer<typeof bulkInput>;
export type BulkAction = BulkInput["action"];

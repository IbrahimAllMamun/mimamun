import { customType, timestamp, uuid } from "drizzle-orm/pg-core";

export const id = () => uuid().primaryKey().defaultRandom();

export const createdAt = () => timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const timestamps = () => ({ createdAt: createdAt(), updatedAt: updatedAt() });

export const timestamptz = () => timestamp({ withTimezone: true, mode: "date" });

/** PostgreSQL `tsvector`, used for generated full-text search columns. */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/** Regex enforced by CHECK constraints on slug columns. */
export const SLUG_CHECK = "^[a-z0-9]+(-[a-z0-9]+)*$";

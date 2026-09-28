import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers";
import { users } from "./auth";
import { mediaKindEnum } from "./enums";

export const media = pgTable(
  "media",
  {
    id: id(),
    /** Random, server-generated object key, e.g. `2026/09/2f1c…e3.webp`. Never user-controlled. */
    storageKey: text().notNull().unique(),
    /** Sanitised original filename, used for downloads only. */
    originalName: text().notNull(),
    mimeType: text().notNull(),
    kind: mediaKindEnum().notNull(),
    sizeBytes: integer().notNull(),
    width: integer(),
    height: integer(),
    checksumSha256: text().notNull(),
    title: text(),
    altText: text(),
    caption: text(),
    uploadedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    index("media_kind_idx").on(t.kind),
    index("media_created_idx").on(t.createdAt.desc()),
    index("media_checksum_idx").on(t.checksumSha256),
    check("media_size_positive", sql`${t.sizeBytes} > 0`),
  ],
);

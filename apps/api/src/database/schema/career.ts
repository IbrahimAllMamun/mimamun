import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers";
import { employmentTypeEnum } from "./enums";
import { media } from "./media";

export interface ExperienceMetric {
  label: string;
  value: string;
  context: string | null;
}

export const experiences = pgTable(
  "experiences",
  {
    id: id(),
    company: text().notNull(),
    companyUrl: text(),
    companyLogoId: uuid().references(() => media.id, { onDelete: "restrict" }),
    position: text().notNull(),
    department: text(),
    /** Nullable: shown only when known. */
    employmentType: employmentTypeEnum(),
    location: text(),
    /** Month precision (first day of the month). Nullable: unknown facts stay unknown. */
    startDate: date({ mode: "string" }),
    endDate: date({ mode: "string" }),
    isCurrent: boolean().notNull().default(false),
    summary: text(),
    responsibilities: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    achievements: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    technologies: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    domains: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Presentation-only annotations; never queried, so JSONB is appropriate. */
    metrics: jsonb()
      .$type<ExperienceMetric[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    featured: boolean().notNull().default(false),
    displayOrder: integer().notNull().default(0),
    isVisible: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    check("experiences_current_has_no_end", sql`NOT ${t.isCurrent} OR ${t.endDate} IS NULL`),
    check(
      "experiences_end_after_start",
      sql`${t.endDate} IS NULL OR ${t.startDate} IS NULL OR ${t.endDate} >= ${t.startDate}`,
    ),
    index("experiences_order_idx").on(t.displayOrder),
  ],
);

export const education = pgTable(
  "education",
  {
    id: id(),
    institution: text().notNull(),
    institutionUrl: text(),
    institutionLogoId: uuid().references(() => media.id, { onDelete: "restrict" }),
    degree: text().notNull(),
    fieldOfStudy: text(),
    location: text(),
    startDate: date({ mode: "string" }),
    endDate: date({ mode: "string" }),
    isCurrent: boolean().notNull().default(false),
    gradeLabel: text(),
    gradeValue: numeric({ precision: 5, scale: 2, mode: "number" }),
    gradeScale: numeric({ precision: 5, scale: 2, mode: "number" }),
    projectTitle: text(),
    description: text(),
    courses: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    featured: boolean().notNull().default(false),
    displayOrder: integer().notNull().default(0),
    isVisible: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    check("education_current_has_no_end", sql`NOT ${t.isCurrent} OR ${t.endDate} IS NULL`),
    check(
      "education_end_after_start",
      sql`${t.endDate} IS NULL OR ${t.startDate} IS NULL OR ${t.endDate} >= ${t.startDate}`,
    ),
    check(
      "education_grade_within_scale",
      sql`${t.gradeValue} IS NULL OR ${t.gradeScale} IS NULL OR ${t.gradeValue} <= ${t.gradeScale}`,
    ),
  ],
);

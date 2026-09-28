import { z } from "zod";
import { EMPLOYMENT_TYPES } from "../enums";
import {
  displayOrder,
  emptyToNull,
  idList,
  nullableMonthDate,
  nullableText,
  nullableUrl,
  requiredText,
  stringList,
  uuid,
} from "./common";

const nullableId = z.preprocess(emptyToNull, uuid.nullable());

const endAfterStart = (value: { startDate: string | null; endDate: string | null }) =>
  !value.startDate || !value.endDate || value.endDate >= value.startDate;

export const experienceMetricInput = z.object({
  label: requiredText(80, "Metric label"),
  value: requiredText(40, "Metric value"),
  context: nullableText(200, "Context"),
});

export const experienceInput = z
  .object({
    company: requiredText(160, "Company"),
    companyUrl: nullableUrl,
    companyLogoId: nullableId,
    position: requiredText(160, "Position"),
    department: nullableText(200, "Department"),
    employmentType: z.preprocess(emptyToNull, z.enum(EMPLOYMENT_TYPES).nullable()),
    location: nullableText(160, "Location"),
    startDate: nullableMonthDate,
    endDate: nullableMonthDate,
    isCurrent: z.boolean().default(false),
    summary: nullableText(4000, "Summary"),
    responsibilities: stringList(30, 500, "Responsibility"),
    achievements: stringList(30, 500, "Achievement"),
    technologies: stringList(40, 60, "Technology"),
    domains: stringList(12, 80, "Domain"),
    metrics: z.array(experienceMetricInput).max(8).default([]),
    projectIds: idList(),
    featured: z.boolean().default(false),
    displayOrder,
    isVisible: z.boolean().default(true),
  })
  .refine((value) => !value.isCurrent || !value.endDate, {
    error: "A current position cannot have an end date",
    path: ["endDate"],
  })
  .refine(endAfterStart, { error: "End date must be after the start date", path: ["endDate"] });
export type ExperienceInput = z.infer<typeof experienceInput>;

const nullableNumber = (min: number, max: number) =>
  z.preprocess(emptyToNull, z.coerce.number().min(min).max(max).nullable());

export const educationInput = z
  .object({
    institution: requiredText(200, "Institution"),
    institutionUrl: nullableUrl,
    institutionLogoId: nullableId,
    degree: requiredText(120, "Degree"),
    fieldOfStudy: nullableText(200, "Field of study"),
    location: nullableText(160, "Location"),
    startDate: nullableMonthDate,
    endDate: nullableMonthDate,
    isCurrent: z.boolean().default(false),
    gradeLabel: nullableText(40, "Grade label"),
    gradeValue: nullableNumber(0, 100),
    gradeScale: nullableNumber(0, 100),
    projectTitle: nullableText(300, "Project or thesis title"),
    description: nullableText(4000, "Description"),
    courses: stringList(40, 160, "Course"),
    featured: z.boolean().default(false),
    displayOrder,
    isVisible: z.boolean().default(true),
  })
  .refine((value) => !value.isCurrent || !value.endDate, {
    error: "A current programme cannot have an end date",
    path: ["endDate"],
  })
  .refine(endAfterStart, { error: "End date must be after the start date", path: ["endDate"] })
  .refine(
    (value) =>
      value.gradeValue === null ||
      value.gradeScale === null ||
      value.gradeValue <= value.gradeScale,
    { error: "Grade cannot exceed the scale", path: ["gradeValue"] },
  );
export type EducationInput = z.infer<typeof educationInput>;

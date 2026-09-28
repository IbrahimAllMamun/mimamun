import { asc, desc, sql } from "drizzle-orm";
import {
  educationInput,
  experienceInput,
  formatPeriod,
  type ExperienceInput,
} from "@portfolio/shared";
import { education, experienceProjects, experiences } from "../../database/schema";
import { loadLinks, syncLinks } from "../../lib/content";
import { assertMediaExists } from "../../lib/media-refs";
import { defineResource, listItem } from "../../lib/resource";

export const experienceResource = defineResource<ExperienceInput>({
  path: "experiences",
  entityType: "experience",
  label: "Experience",
  table: experiences,
  input: experienceInput,
  searchColumns: ["company", "position", "department"],
  // Current roles first, then most recent end date, then manual order.
  defaultSort: [
    desc(experiences.isCurrent),
    sql`${experiences.endDate} DESC NULLS FIRST`,
    asc(experiences.displayOrder),
  ],
  relationKeys: ["projectIds"],
  listItem: (row) =>
    listItem(row, {
      title: `${String(row.position)} · ${String(row.company)}`,
      subtitle:
        formatPeriod(
          row.startDate as string | null,
          row.endDate as string | null,
          Boolean(row.isCurrent),
        ) || null,
      extra: { current: Boolean(row.isCurrent) },
    }),
  loadRelations: async (db, ids) => {
    const links = await loadLinks(db, experienceProjects, "experienceId", ids, "projectId");
    return new Map(ids.map((id) => [id, { projectIds: links.get(id) ?? [] }]));
  },
  saveRelations: (tx, id, input) =>
    syncLinks(tx, experienceProjects, "experienceId", id, "projectId", input.projectIds),
  validate: async (db, input) => {
    await assertMediaExists(db, [
      { id: input.companyLogoId, kind: "image", path: "companyLogoId" },
    ]);
  },
});

export const educationResource = defineResource({
  path: "education",
  entityType: "education",
  label: "Education",
  table: education,
  input: educationInput,
  searchColumns: ["institution", "degree", "fieldOfStudy", "projectTitle"],
  defaultSort: [asc(education.displayOrder), sql`${education.endDate} DESC NULLS FIRST`],
  listItem: (row) =>
    listItem(row, {
      title: [row.degree, row.fieldOfStudy].filter(Boolean).join(" in "),
      subtitle: `${String(row.institution)} · ${formatPeriod(row.startDate as string | null, row.endDate as string | null, Boolean(row.isCurrent))}`,
    }),
  validate: async (db, input) => {
    await assertMediaExists(db, [
      { id: input.institutionLogoId, kind: "image", path: "institutionLogoId" },
    ]);
  },
});

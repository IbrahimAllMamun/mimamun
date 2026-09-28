import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  educationAnchor,
  experienceAnchor,
  PRESENTATION_TYPE_LABELS,
  type EducationDTO,
  type ExperienceDTO,
  type PresentationDTO,
  type PublicationDTO,
  type TrajectoryItemDTO,
} from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import { education, experienceProjects, experiences, projects, research } from "../../database/schema";
import { loadMediaMap, pick } from "../media/mapper";
import { projectLink } from "./projects";
import { listed } from "./visibility";

export async function listPublicExperiences(db: DbExecutor): Promise<ExperienceDTO[]> {
  const rows = await db
    .select()
    .from(experiences)
    .where(eq(experiences.isVisible, true))
    .orderBy(desc(experiences.isCurrent), sql`${experiences.endDate} DESC NULLS FIRST`, asc(experiences.displayOrder));
  if (rows.length === 0) return [];
  const [mediaMap, links] = await Promise.all([
    loadMediaMap(db, rows.map((row) => row.companyLogoId)),
    db
      .select({ experienceId: experienceProjects.experienceId, slug: projects.slug, title: projects.title, type: projects.type })
      .from(experienceProjects)
      .innerJoin(projects, eq(projects.id, experienceProjects.projectId))
      .where(and(inArray(experienceProjects.experienceId, rows.map((row) => row.id)), listed(projects))),
  ]);
  return rows.map((row) => ({
    id: row.id,
    company: row.company,
    companyUrl: row.companyUrl,
    companyLogo: pick(mediaMap, row.companyLogoId),
    position: row.position,
    department: row.department,
    employmentType: row.employmentType,
    location: row.location,
    startDate: row.startDate,
    endDate: row.endDate,
    isCurrent: row.isCurrent,
    summary: row.summary,
    responsibilities: row.responsibilities,
    achievements: row.achievements,
    technologies: row.technologies,
    domains: row.domains,
    metrics: row.metrics,
    featured: row.featured,
    relatedProjects: links.filter((link) => link.experienceId === row.id).map(projectLink),
  }));
}

export async function listPublicEducation(db: DbExecutor): Promise<EducationDTO[]> {
  const rows = await db
    .select()
    .from(education)
    .where(eq(education.isVisible, true))
    .orderBy(asc(education.displayOrder), sql`${education.endDate} DESC NULLS FIRST`);
  if (rows.length === 0) return [];
  const [mediaMap, researchRows] = await Promise.all([
    loadMediaMap(db, rows.map((row) => row.institutionLogoId)),
    db
      .select({ educationId: research.educationId, slug: research.slug, title: research.title, kind: research.kind })
      .from(research)
      .where(and(inArray(research.educationId, rows.map((row) => row.id)), listed(research))),
  ]);
  return rows.map((row) => ({
    id: row.id,
    institution: row.institution,
    institutionUrl: row.institutionUrl,
    institutionLogo: pick(mediaMap, row.institutionLogoId),
    degree: row.degree,
    fieldOfStudy: row.fieldOfStudy,
    location: row.location,
    startDate: row.startDate,
    endDate: row.endDate,
    isCurrent: row.isCurrent,
    gradeLabel: row.gradeLabel,
    gradeValue: row.gradeValue,
    gradeScale: row.gradeScale,
    projectTitle: row.projectTitle,
    description: row.description,
    courses: row.courses,
    research: researchRows
      .filter((item) => item.educationId === row.id)
      .map(({ slug, title, kind }) => ({ slug, title, kind })),
  }));
}

/**
 * The trajectory figure: education, roles, presentations and publications on
 * one time axis, built only from stored dates.
 */
export function buildTrajectory(
  educationItems: EducationDTO[],
  experienceItems: ExperienceDTO[],
  presentations: PresentationDTO[],
  publications: PublicationDTO[],
): TrajectoryItemDTO[] {
  const items: TrajectoryItemDTO[] = [
    ...educationItems.map((item) => ({
      id: item.id,
      kind: "education" as const,
      label: [item.degree, item.fieldOfStudy].filter(Boolean).join(" "),
      sublabel: item.institution,
      start: item.startDate,
      end: item.endDate,
      isCurrent: item.isCurrent,
      href: `/about#${educationAnchor(item)}`,
    })),
    ...experienceItems.map((item) => ({
      id: item.id,
      kind: "experience" as const,
      label: item.position,
      sublabel: item.company,
      start: item.startDate,
      end: item.endDate,
      isCurrent: item.isCurrent,
      href: `/experience#${experienceAnchor(item)}`,
    })),
    ...presentations
      .filter((item) => item.presentedOn)
      .map((item) => ({
        id: item.id,
        kind: "presentation" as const,
        label: `${PRESENTATION_TYPE_LABELS[item.presentationType]}, ${item.conferenceShortName ?? item.conferenceName}`,
        sublabel: item.location,
        start: item.presentedOn,
        end: item.presentedOn,
        isCurrent: false,
        href: item.research ? `/research/${item.research.slug}` : "/research",
      })),
    ...publications
      .filter((item) => item.publishedOn)
      .map((item) => ({
        id: item.id,
        kind: "publication" as const,
        label: item.venue ?? "Publication",
        sublabel: item.title,
        start: item.publishedOn,
        end: item.publishedOn,
        isCurrent: false,
        href: "/publications",
      })),
  ];
  const sortKey = (item: TrajectoryItemDTO) => item.start ?? item.end ?? "9999";
  // Chronological; on the same month, something that ended then comes before
  // something that started then (a previous role before the one that followed it).
  const endedAtKey = (item: TrajectoryItemDTO) => (item.start === null && item.end !== null ? 0 : 1);
  return items.sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || endedAtKey(a) - endedAtKey(b));
}

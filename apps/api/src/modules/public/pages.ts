import { and, asc, count, desc, eq } from "drizzle-orm";
import type { AboutDTO, ExperiencePageDTO, HomeDTO, ResearchPageDTO } from "@portfolio/shared";
import type { DbExecutor } from "../../database/client";
import {
  approachSteps,
  blogPosts,
  conferencePresentations,
  focusAreas,
  projects,
  publications,
  research,
} from "../../database/schema";
import { toPostSummaries } from "./blog";
import { buildTrajectory, listPublicEducation, listPublicExperiences } from "./career";
import { toProjectSummaries } from "./projects";
import {
  listPublishedPresentations,
  listPublishedPublications,
  listPublishedResearch,
} from "./research";
import { credentialSummary, getSkillTree } from "./taxonomies";
import { listed } from "./visibility";

async function focusAndApproach(db: DbExecutor) {
  const [areas, steps] = await Promise.all([
    db
      .select()
      .from(focusAreas)
      .where(eq(focusAreas.isVisible, true))
      .orderBy(asc(focusAreas.displayOrder)),
    db
      .select()
      .from(approachSteps)
      .where(eq(approachSteps.isVisible, true))
      .orderBy(asc(approachSteps.displayOrder)),
  ]);
  const map = (row: {
    id: string;
    title: string;
    description: string;
    evidence: string | null;
  }) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    evidence: row.evidence,
  });
  return { focusAreas: areas.map(map), approachSteps: steps.map(map) };
}

async function countListed(
  db: DbExecutor,
  table:
    | typeof projects
    | typeof research
    | typeof publications
    | typeof blogPosts
    | typeof conferencePresentations,
) {
  const [row] = await db.select({ value: count() }).from(table).where(listed(table));
  return row?.value ?? 0;
}

export async function getHome(db: DbExecutor): Promise<HomeDTO> {
  const [
    featuredRows,
    latestRows,
    experienceItems,
    educationItems,
    presentations,
    publicationItems,
    postRows,
    featuredResearch,
    focus,
    credentials,
  ] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(and(listed(projects), eq(projects.featured, true)))
      .orderBy(asc(projects.displayOrder))
      .limit(4),
    db.select().from(projects).where(listed(projects)).orderBy(desc(projects.publishedAt)).limit(3),
    listPublicExperiences(db),
    listPublicEducation(db),
    listPublishedPresentations(db),
    listPublishedPublications(db),
    db
      .select()
      .from(blogPosts)
      .where(listed(blogPosts))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(3),
    listPublishedResearch(db, { featuredOnly: true, limit: 3 }),
    focusAndApproach(db),
    credentialSummary(db),
  ]);
  const [projectCount, researchCount, publicationCount, presentationCount, postCount] =
    await Promise.all([
      countListed(db, projects),
      countListed(db, research),
      countListed(db, publications),
      countListed(db, conferencePresentations),
      countListed(db, blogPosts),
    ]);
  return {
    ...focus,
    // Falls back to the latest projects when nothing is marked as featured.
    featuredProjects: await toProjectSummaries(db, featuredRows.length ? featuredRows : latestRows),
    featuredResearch,
    presentations: presentations.slice(0, 3),
    currentExperience: experienceItems.filter((item) => item.isCurrent),
    previousExperience: experienceItems.filter((item) => !item.isCurrent).slice(0, 2),
    education: educationItems,
    trajectory: buildTrajectory(educationItems, experienceItems, presentations, publicationItems),
    latestPosts: await toPostSummaries(db, postRows),
    counts: {
      projects: projectCount,
      research: researchCount,
      publications: publicationCount,
      presentations: presentationCount,
      credentials: credentials.total,
      credentialProviders: credentials.providers.length,
      posts: postCount,
    },
  };
}

export async function getAbout(db: DbExecutor): Promise<AboutDTO> {
  const [educationItems, skills, focus, experience, credentials] = await Promise.all([
    listPublicEducation(db),
    getSkillTree(db),
    focusAndApproach(db),
    listPublicExperiences(db),
    credentialSummary(db),
  ]);
  return {
    education: educationItems,
    skills,
    ...focus,
    experience,
    credentialSummary: credentials,
  };
}

export async function getExperiencePage(db: DbExecutor): Promise<ExperiencePageDTO> {
  const [experienceItems, educationItems, presentations, publicationItems] = await Promise.all([
    listPublicExperiences(db),
    listPublicEducation(db),
    listPublishedPresentations(db),
    listPublishedPublications(db),
  ]);
  return {
    experiences: experienceItems,
    education: educationItems,
    trajectory: buildTrajectory(educationItems, experienceItems, presentations, publicationItems),
  };
}

export async function getResearchPage(db: DbExecutor): Promise<ResearchPageDTO> {
  const [researchItems, presentations, publicationItems] = await Promise.all([
    listPublishedResearch(db),
    listPublishedPresentations(db),
    listPublishedPublications(db),
  ]);
  return { research: researchItems, presentations, publications: publicationItems };
}

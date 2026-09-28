import { index, integer, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { blogPosts } from "./blog";
import { experiences } from "./career";
import { credentials } from "./credentials";
import { projects } from "./projects";
import { publications, research } from "./research";
import { skills } from "./skills";
import { blogCategories, tags } from "./taxonomy";

/** Many-to-many relations. Each join table cascades with both sides. */

export const experienceProjects = pgTable(
  "experience_projects",
  {
    experienceId: uuid()
      .notNull()
      .references(() => experiences.id, { onDelete: "cascade" }),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.experienceId, t.projectId] }),
    index("experience_projects_project_idx").on(t.projectId),
  ],
);

export const projectTags = pgTable(
  "project_tags",
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.tagId] }), index("project_tags_tag_idx").on(t.tagId)],
);

export const projectResearch = pgTable(
  "project_research",
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    researchId: uuid()
      .notNull()
      .references(() => research.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.researchId] }),
    index("project_research_research_idx").on(t.researchId),
  ],
);

export const projectPublications = pgTable(
  "project_publications",
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    publicationId: uuid()
      .notNull()
      .references(() => publications.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.publicationId] }),
    index("project_publications_publication_idx").on(t.publicationId),
  ],
);

export const skillProjects = pgTable(
  "skill_projects",
  {
    skillId: uuid()
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.skillId, t.projectId] }),
    index("skill_projects_project_idx").on(t.projectId),
  ],
);

export const credentialSkills = pgTable(
  "credential_skills",
  {
    credentialId: uuid()
      .notNull()
      .references(() => credentials.id, { onDelete: "cascade" }),
    skillId: uuid()
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.credentialId, t.skillId] }),
    index("credential_skills_skill_idx").on(t.skillId),
  ],
);

export const blogPostCategories = pgTable(
  "blog_post_categories",
  {
    postId: uuid()
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    categoryId: uuid()
      .notNull()
      .references(() => blogCategories.id, { onDelete: "cascade" }),
    displayOrder: integer().notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.categoryId] }),
    index("blog_post_categories_category_idx").on(t.categoryId),
  ],
);

export const blogPostTags = pgTable(
  "blog_post_tags",
  {
    postId: uuid()
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index("blog_post_tags_tag_idx").on(t.tagId)],
);

export const blogPostProjects = pgTable(
  "blog_post_projects",
  {
    postId: uuid()
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.projectId] }),
    index("blog_post_projects_project_idx").on(t.projectId),
  ],
);

export const blogPostResearch = pgTable(
  "blog_post_research",
  {
    postId: uuid()
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    researchId: uuid()
      .notNull()
      .references(() => research.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.researchId] }),
    index("blog_post_research_research_idx").on(t.researchId),
  ],
);

import { relations } from "drizzle-orm";
import { auditLogs, rolePermissions, roles, sessions, users } from "./auth";
import { blogPosts } from "./blog";
import { education, experiences } from "./career";
import { credentialProviders, credentials } from "./credentials";
import {
  blogPostCategories,
  blogPostProjects,
  blogPostResearch,
  blogPostTags,
  credentialSkills,
  experienceProjects,
  projectPublications,
  projectResearch,
  projectTags,
  skillProjects,
} from "./joins";
import { media } from "./media";
import { githubRepositories } from "./operations";
import { projectMedia, projectMetrics, projects } from "./projects";
import { conferencePresentations, publications, research } from "./research";
import { profile, seoMetadata } from "./site";
import { skillCategories, skills } from "./skills";
import { blogCategories, credentialTypes, projectCategories, tags } from "./taxonomy";

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  permissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const profileRelations = relations(profile, ({ one }) => ({
  avatar: one(media, { fields: [profile.avatarMediaId], references: [media.id], relationName: "profile_avatar" }),
  cv: one(media, { fields: [profile.cvMediaId], references: [media.id], relationName: "profile_cv" }),
}));

export const seoMetadataRelations = relations(seoMetadata, ({ one }) => ({
  ogImage: one(media, { fields: [seoMetadata.ogImageId], references: [media.id] }),
}));

export const experiencesRelations = relations(experiences, ({ one, many }) => ({
  companyLogo: one(media, { fields: [experiences.companyLogoId], references: [media.id] }),
  projects: many(experienceProjects),
}));

export const experienceProjectsRelations = relations(experienceProjects, ({ one }) => ({
  experience: one(experiences, { fields: [experienceProjects.experienceId], references: [experiences.id] }),
  project: one(projects, { fields: [experienceProjects.projectId], references: [projects.id] }),
}));

export const educationRelations = relations(education, ({ one, many }) => ({
  institutionLogo: one(media, { fields: [education.institutionLogoId], references: [media.id] }),
  research: many(research),
}));

export const projectCategoriesRelations = relations(projectCategories, ({ many }) => ({
  projects: many(projects),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  projects: many(projectTags),
  posts: many(blogPostTags),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  category: one(projectCategories, { fields: [projects.categoryId], references: [projectCategories.id] }),
  cover: one(media, { fields: [projects.coverMediaId], references: [media.id] }),
  seo: one(seoMetadata, { fields: [projects.seoId], references: [seoMetadata.id] }),
  tags: many(projectTags),
  gallery: many(projectMedia),
  metrics: many(projectMetrics),
  research: many(projectResearch),
  publications: many(projectPublications),
  experiences: many(experienceProjects),
  skills: many(skillProjects),
  repositories: many(githubRepositories),
}));

export const projectTagsRelations = relations(projectTags, ({ one }) => ({
  project: one(projects, { fields: [projectTags.projectId], references: [projects.id] }),
  tag: one(tags, { fields: [projectTags.tagId], references: [tags.id] }),
}));

export const projectMediaRelations = relations(projectMedia, ({ one }) => ({
  project: one(projects, { fields: [projectMedia.projectId], references: [projects.id] }),
  media: one(media, { fields: [projectMedia.mediaId], references: [media.id] }),
}));

export const projectMetricsRelations = relations(projectMetrics, ({ one }) => ({
  project: one(projects, { fields: [projectMetrics.projectId], references: [projects.id] }),
}));

export const projectResearchRelations = relations(projectResearch, ({ one }) => ({
  project: one(projects, { fields: [projectResearch.projectId], references: [projects.id] }),
  research: one(research, { fields: [projectResearch.researchId], references: [research.id] }),
}));

export const projectPublicationsRelations = relations(projectPublications, ({ one }) => ({
  project: one(projects, { fields: [projectPublications.projectId], references: [projects.id] }),
  publication: one(publications, {
    fields: [projectPublications.publicationId],
    references: [publications.id],
  }),
}));

export const researchRelations = relations(research, ({ one, many }) => ({
  education: one(education, { fields: [research.educationId], references: [education.id] }),
  pdf: one(media, { fields: [research.pdfMediaId], references: [media.id], relationName: "research_pdf" }),
  poster: one(media, {
    fields: [research.posterMediaId],
    references: [media.id],
    relationName: "research_poster",
  }),
  slides: one(media, {
    fields: [research.slidesMediaId],
    references: [media.id],
    relationName: "research_slides",
  }),
  cover: one(media, {
    fields: [research.coverMediaId],
    references: [media.id],
    relationName: "research_cover",
  }),
  seo: one(seoMetadata, { fields: [research.seoId], references: [seoMetadata.id] }),
  publications: many(publications),
  presentations: many(conferencePresentations),
  projects: many(projectResearch),
  posts: many(blogPostResearch),
}));

export const publicationsRelations = relations(publications, ({ one, many }) => ({
  research: one(research, { fields: [publications.researchId], references: [research.id] }),
  pdf: one(media, { fields: [publications.pdfMediaId], references: [media.id] }),
  seo: one(seoMetadata, { fields: [publications.seoId], references: [seoMetadata.id] }),
  projects: many(projectPublications),
}));

export const conferencePresentationsRelations = relations(conferencePresentations, ({ one }) => ({
  research: one(research, { fields: [conferencePresentations.researchId], references: [research.id] }),
  poster: one(media, {
    fields: [conferencePresentations.posterMediaId],
    references: [media.id],
    relationName: "presentation_poster",
  }),
  slides: one(media, {
    fields: [conferencePresentations.slidesMediaId],
    references: [media.id],
    relationName: "presentation_slides",
  }),
}));

export const skillCategoriesRelations = relations(skillCategories, ({ one, many }) => ({
  parent: one(skillCategories, {
    fields: [skillCategories.parentId],
    references: [skillCategories.id],
    relationName: "skill_category_tree",
  }),
  children: many(skillCategories, { relationName: "skill_category_tree" }),
  skills: many(skills),
}));

export const skillsRelations = relations(skills, ({ one, many }) => ({
  category: one(skillCategories, { fields: [skills.categoryId], references: [skillCategories.id] }),
  projects: many(skillProjects),
  credentials: many(credentialSkills),
}));

export const skillProjectsRelations = relations(skillProjects, ({ one }) => ({
  skill: one(skills, { fields: [skillProjects.skillId], references: [skills.id] }),
  project: one(projects, { fields: [skillProjects.projectId], references: [projects.id] }),
}));

export const credentialProvidersRelations = relations(credentialProviders, ({ one, many }) => ({
  logo: one(media, { fields: [credentialProviders.logoMediaId], references: [media.id] }),
  credentials: many(credentials),
}));

export const credentialTypesRelations = relations(credentialTypes, ({ many }) => ({
  credentials: many(credentials),
}));

export const credentialsRelations = relations(credentials, ({ one, many }) => ({
  provider: one(credentialProviders, {
    fields: [credentials.providerId],
    references: [credentialProviders.id],
  }),
  type: one(credentialTypes, { fields: [credentials.typeId], references: [credentialTypes.id] }),
  parent: one(credentials, {
    fields: [credentials.parentId],
    references: [credentials.id],
    relationName: "credential_tree",
  }),
  children: many(credentials, { relationName: "credential_tree" }),
  image: one(media, {
    fields: [credentials.imageMediaId],
    references: [media.id],
    relationName: "credential_image",
  }),
  pdf: one(media, {
    fields: [credentials.pdfMediaId],
    references: [media.id],
    relationName: "credential_pdf",
  }),
  relatedProject: one(projects, { fields: [credentials.relatedProjectId], references: [projects.id] }),
  skills: many(credentialSkills),
}));

export const credentialSkillsRelations = relations(credentialSkills, ({ one }) => ({
  credential: one(credentials, { fields: [credentialSkills.credentialId], references: [credentials.id] }),
  skill: one(skills, { fields: [credentialSkills.skillId], references: [skills.id] }),
}));

export const blogCategoriesRelations = relations(blogCategories, ({ many }) => ({
  posts: many(blogPostCategories),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  cover: one(media, { fields: [blogPosts.coverMediaId], references: [media.id] }),
  author: one(users, { fields: [blogPosts.authorId], references: [users.id] }),
  seo: one(seoMetadata, { fields: [blogPosts.seoId], references: [seoMetadata.id] }),
  categories: many(blogPostCategories),
  tags: many(blogPostTags),
  projects: many(blogPostProjects),
  research: many(blogPostResearch),
}));

export const blogPostCategoriesRelations = relations(blogPostCategories, ({ one }) => ({
  post: one(blogPosts, { fields: [blogPostCategories.postId], references: [blogPosts.id] }),
  category: one(blogCategories, { fields: [blogPostCategories.categoryId], references: [blogCategories.id] }),
}));

export const blogPostTagsRelations = relations(blogPostTags, ({ one }) => ({
  post: one(blogPosts, { fields: [blogPostTags.postId], references: [blogPosts.id] }),
  tag: one(tags, { fields: [blogPostTags.tagId], references: [tags.id] }),
}));

export const blogPostProjectsRelations = relations(blogPostProjects, ({ one }) => ({
  post: one(blogPosts, { fields: [blogPostProjects.postId], references: [blogPosts.id] }),
  project: one(projects, { fields: [blogPostProjects.projectId], references: [projects.id] }),
}));

export const blogPostResearchRelations = relations(blogPostResearch, ({ one }) => ({
  post: one(blogPosts, { fields: [blogPostResearch.postId], references: [blogPosts.id] }),
  research: one(research, { fields: [blogPostResearch.researchId], references: [research.id] }),
}));

export const githubRepositoriesRelations = relations(githubRepositories, ({ one }) => ({
  project: one(projects, { fields: [githubRepositories.projectId], references: [projects.id] }),
}));

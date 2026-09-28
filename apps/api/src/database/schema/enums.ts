import { pgEnum } from "drizzle-orm/pg-core";
import {
  ANALYTICS_EVENT_TYPES,
  CONTACT_STATUSES,
  CONTENT_STATUSES,
  DEVICE_CATEGORIES,
  EMPLOYMENT_TYPES,
  MEDIA_KINDS,
  NAV_LOCATIONS,
  PRESENTATION_TYPES,
  PROJECT_MEDIA_KINDS,
  PROJECT_TYPES,
  PUBLICATION_STATUSES,
  PUBLICATION_TYPES,
  RESEARCH_KINDS,
  SKILL_LEVELS,
  USER_STATUSES,
  VISIBILITIES,
} from "@portfolio/shared";

// Enum values come from @portfolio/shared so validation, UI and database never disagree.
export const contentStatusEnum = pgEnum("content_status", CONTENT_STATUSES);
export const visibilityEnum = pgEnum("visibility", VISIBILITIES);
export const employmentTypeEnum = pgEnum("employment_type", EMPLOYMENT_TYPES);
export const projectTypeEnum = pgEnum("project_type", PROJECT_TYPES);
export const projectMediaKindEnum = pgEnum("project_media_kind", PROJECT_MEDIA_KINDS);
export const researchKindEnum = pgEnum("research_kind", RESEARCH_KINDS);
export const publicationStatusEnum = pgEnum("publication_status", PUBLICATION_STATUSES);
export const publicationTypeEnum = pgEnum("publication_type", PUBLICATION_TYPES);
export const presentationTypeEnum = pgEnum("presentation_type", PRESENTATION_TYPES);
export const skillLevelEnum = pgEnum("skill_level", SKILL_LEVELS);
export const mediaKindEnum = pgEnum("media_kind", MEDIA_KINDS);
export const contactStatusEnum = pgEnum("contact_status", CONTACT_STATUSES);
export const navLocationEnum = pgEnum("nav_location", NAV_LOCATIONS);
export const userStatusEnum = pgEnum("user_status", USER_STATUSES);
export const analyticsEventTypeEnum = pgEnum("analytics_event_type", ANALYTICS_EVENT_TYPES);
export const deviceCategoryEnum = pgEnum("device_category", DEVICE_CATEGORIES);

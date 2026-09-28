CREATE TYPE "public"."analytics_event_type" AS ENUM('page_view', 'download', 'outbound_click');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('new', 'read', 'replied', 'archived', 'spam');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."device_category" AS ENUM('desktop', 'mobile', 'tablet');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'internship', 'freelance', 'research', 'volunteer');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'document', 'video');--> statement-breakpoint
CREATE TYPE "public"."nav_location" AS ENUM('header', 'footer');--> statement-breakpoint
CREATE TYPE "public"."presentation_type" AS ENUM('poster', 'oral', 'invited_talk', 'keynote', 'workshop', 'panel');--> statement-breakpoint
CREATE TYPE "public"."project_media_kind" AS ENUM('gallery', 'screenshot', 'chart', 'video', 'document');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('professional', 'research', 'academic', 'personal');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('published', 'in_press', 'accepted', 'under_review', 'submitted', 'preprint', 'working_paper');--> statement-breakpoint
CREATE TYPE "public"."publication_type" AS ENUM('journal_article', 'conference_paper', 'book_chapter', 'preprint', 'thesis', 'report', 'other');--> statement-breakpoint
CREATE TYPE "public"."research_kind" AS ENUM('thesis', 'academic_project', 'research_project', 'working_paper', 'report');--> statement-breakpoint
CREATE TYPE "public"."skill_level" AS ENUM('foundational', 'working', 'advanced', 'expert');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'unlisted');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"actor_email" text,
	"actor_name" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"summary" text,
	"previous_value" jsonb,
	"new_value" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_action_not_empty" CHECK (length("audit_logs"."action") > 0)
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_pk" PRIMARY KEY("role_id","permission")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"csrf_token" text NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role_id" uuid NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"kind" "media_kind" NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"checksum_sha256" text NOT NULL,
	"title" text,
	"alt_text" text,
	"caption" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storageKey_unique" UNIQUE("storage_key"),
	CONSTRAINT "media_size_positive" CHECK ("media"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "approach_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"evidence" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "focus_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"evidence" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "navigation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location" "nav_location" DEFAULT 'header' NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"open_in_new_tab" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"full_name" text NOT NULL,
	"headline" text NOT NULL,
	"statement" text,
	"intro" text,
	"bio" text,
	"philosophy" text,
	"research_interests" text,
	"interests" text,
	"location" text,
	"email" text,
	"availability" text,
	"avatar_media_id" uuid,
	"cv_media_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_singleton" CHECK ("profile"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "seo_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_key" text,
	"title" text,
	"description" text,
	"canonical_url" text,
	"og_image_id" uuid,
	"noindex" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seo_metadata_routeKey_unique" UNIQUE("route_key")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"site_name" text NOT NULL,
	"site_description" text NOT NULL,
	"default_og_image_id" uuid,
	"footer_note" text,
	"contact_form_enabled" boolean DEFAULT true NOT NULL,
	"contact_notification_email" text,
	"analytics_enabled" boolean DEFAULT true NOT NULL,
	"analytics_retention_days" integer DEFAULT 395 NOT NULL,
	"github_username" text,
	"github_sync_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 1),
	CONSTRAINT "site_settings_retention_range" CHECK ("site_settings"."analytics_retention_days" BETWEEN 30 AND 1095)
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"handle" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "blog_categories_slug_format" CHECK ("blog_categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "credential_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credential_types_slug_unique" UNIQUE("slug"),
	CONSTRAINT "credential_types_slug_format" CHECK ("credential_types"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "project_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "project_categories_slug_format" CHECK ("project_categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tags_slug_format" CHECK ("tags"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution" text NOT NULL,
	"institution_url" text,
	"institution_logo_id" uuid,
	"degree" text NOT NULL,
	"field_of_study" text,
	"location" text,
	"start_date" date,
	"end_date" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"grade_label" text,
	"grade_value" numeric(5, 2),
	"grade_scale" numeric(5, 2),
	"project_title" text,
	"description" text,
	"courses" text[] DEFAULT '{}'::text[] NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "education_current_has_no_end" CHECK (NOT "education"."is_current" OR "education"."end_date" IS NULL),
	CONSTRAINT "education_end_after_start" CHECK ("education"."end_date" IS NULL OR "education"."start_date" IS NULL OR "education"."end_date" >= "education"."start_date"),
	CONSTRAINT "education_grade_within_scale" CHECK ("education"."grade_value" IS NULL OR "education"."grade_scale" IS NULL OR "education"."grade_value" <= "education"."grade_scale")
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"company_url" text,
	"company_logo_id" uuid,
	"position" text NOT NULL,
	"department" text,
	"employment_type" "employment_type",
	"location" text,
	"start_date" date,
	"end_date" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"summary" text,
	"responsibilities" text[] DEFAULT '{}'::text[] NOT NULL,
	"achievements" text[] DEFAULT '{}'::text[] NOT NULL,
	"technologies" text[] DEFAULT '{}'::text[] NOT NULL,
	"domains" text[] DEFAULT '{}'::text[] NOT NULL,
	"metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experiences_current_has_no_end" CHECK (NOT "experiences"."is_current" OR "experiences"."end_date" IS NULL),
	CONSTRAINT "experiences_end_after_start" CHECK ("experiences"."end_date" IS NULL OR "experiences"."start_date" IS NULL OR "experiences"."end_date" >= "experiences"."start_date")
);
--> statement-breakpoint
CREATE TABLE "project_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"kind" "project_media_kind" DEFAULT 'gallery' NOT NULL,
	"caption" text,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"unit" text,
	"context" text,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text NOT NULL,
	"type" "project_type" DEFAULT 'professional' NOT NULL,
	"category_id" uuid,
	"role" text,
	"organization" text,
	"started_on" date,
	"completed_on" date,
	"technologies" text[] DEFAULT '{}'::text[] NOT NULL,
	"github_url" text,
	"demo_url" text,
	"docs_url" text,
	"cover_media_id" uuid,
	"sections" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"seo_id" uuid,
	"search_text" text DEFAULT '' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(summary, '')), 'B') || setweight(to_tsvector('english', coalesce(search_text, '')), 'C')) STORED,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug"),
	CONSTRAINT "projects_slug_format" CHECK ("projects"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "projects_period_order" CHECK ("projects"."completed_on" IS NULL OR "projects"."started_on" IS NULL OR "projects"."completed_on" >= "projects"."started_on"),
	CONSTRAINT "projects_published_has_date" CHECK ("projects"."status" <> 'published' OR "projects"."published_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "conference_presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"conference_name" text NOT NULL,
	"conference_short_name" text,
	"edition" text,
	"location" text,
	"presented_on" date,
	"presentation_type" "presentation_type" DEFAULT 'poster' NOT NULL,
	"abstract" text,
	"poster_media_id" uuid,
	"slides_media_id" uuid,
	"event_url" text,
	"research_id" uuid,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conference_presentations_published_has_date" CHECK ("conference_presentations"."status" <> 'published' OR "conference_presentations"."published_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"authors" text[] DEFAULT '{}'::text[] NOT NULL,
	"publication_type" "publication_type" DEFAULT 'journal_article' NOT NULL,
	"publication_status" "publication_status" DEFAULT 'published' NOT NULL,
	"venue" text,
	"volume" text,
	"issue" text,
	"pages" text,
	"publisher" text,
	"published_on" date,
	"doi" text,
	"url" text,
	"pdf_media_id" uuid,
	"abstract" text,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"methodology" text,
	"findings" text,
	"citation_text" text,
	"bibtex" text,
	"research_id" uuid,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"seo_id" uuid,
	"search_text" text DEFAULT '' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(abstract, '')), 'B') || setweight(to_tsvector('english', coalesce(search_text, '')), 'C')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publications_slug_unique" UNIQUE("slug"),
	CONSTRAINT "publications_slug_format" CHECK ("publications"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "publications_published_has_date" CHECK ("publications"."status" <> 'published' OR "publications"."published_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"kind" "research_kind" DEFAULT 'research_project' NOT NULL,
	"summary" text NOT NULL,
	"abstract" text,
	"research_question" text,
	"sections" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"methods" text[] DEFAULT '{}'::text[] NOT NULL,
	"authors" text[] DEFAULT '{}'::text[] NOT NULL,
	"degree" text,
	"institution" text,
	"supervisor" text,
	"education_id" uuid,
	"started_on" date,
	"completed_on" date,
	"pdf_media_id" uuid,
	"poster_media_id" uuid,
	"slides_media_id" uuid,
	"cover_media_id" uuid,
	"external_url" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"seo_id" uuid,
	"search_text" text DEFAULT '' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(summary, '')), 'B') || setweight(to_tsvector('english', coalesce(abstract, '') || ' ' || coalesce(search_text, '')), 'C')) STORED,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "research_slug_unique" UNIQUE("slug"),
	CONSTRAINT "research_slug_format" CHECK ("research"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "research_period_order" CHECK ("research"."completed_on" IS NULL OR "research"."started_on" IS NULL OR "research"."completed_on" >= "research"."started_on"),
	CONSTRAINT "research_published_has_date" CHECK ("research"."status" <> 'published' OR "research"."published_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "skill_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "skill_categories_not_own_parent" CHECK ("skill_categories"."parent_id" IS NULL OR "skill_categories"."parent_id" <> "skill_categories"."id"),
	CONSTRAINT "skill_categories_slug_format" CHECK ("skill_categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"level" "skill_level",
	"years" numeric(4, 1),
	"icon" text,
	"technologies" text[] DEFAULT '{}'::text[] NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_category_slug_unique" UNIQUE("category_id","slug"),
	CONSTRAINT "skills_slug_format" CHECK ("skills"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "skills_years_range" CHECK ("skills"."years" IS NULL OR ("skills"."years" >= 0 AND "skills"."years" <= 60))
);
--> statement-breakpoint
CREATE TABLE "credential_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"website_url" text,
	"logo_media_id" uuid,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credential_providers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "credential_providers_slug_format" CHECK ("credential_providers"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"parent_id" uuid,
	"type_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"level" text,
	"description" text,
	"issued_on" date,
	"expires_on" date,
	"credential_code" text,
	"credential_url" text,
	"verification_url" text,
	"image_media_id" uuid,
	"pdf_media_id" uuid,
	"related_project_id" uuid,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credentials_slug_unique" UNIQUE("slug"),
	CONSTRAINT "credentials_id_provider_unique" UNIQUE("id","provider_id"),
	CONSTRAINT "credentials_not_own_parent" CHECK ("credentials"."parent_id" IS NULL OR "credentials"."parent_id" <> "credentials"."id"),
	CONSTRAINT "credentials_expiry_after_issue" CHECK ("credentials"."expires_on" IS NULL OR "credentials"."issued_on" IS NULL OR "credentials"."expires_on" >= "credentials"."issued_on"),
	CONSTRAINT "credentials_slug_format" CHECK ("credentials"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"cover_media_id" uuid,
	"body" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author_id" uuid,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"reading_time_minutes" integer DEFAULT 1 NOT NULL,
	"seo_id" uuid,
	"search_text" text DEFAULT '' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') || setweight(to_tsvector('english', coalesce(search_text, '')), 'C')) STORED,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "blog_posts_slug_format" CHECK ("blog_posts"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "blog_posts_published_has_date" CHECK ("blog_posts"."status" <> 'published' OR "blog_posts"."published_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "blog_post_categories" (
	"post_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "blog_post_categories_post_id_category_id_pk" PRIMARY KEY("post_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "blog_post_projects" (
	"post_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	CONSTRAINT "blog_post_projects_post_id_project_id_pk" PRIMARY KEY("post_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "blog_post_research" (
	"post_id" uuid NOT NULL,
	"research_id" uuid NOT NULL,
	CONSTRAINT "blog_post_research_post_id_research_id_pk" PRIMARY KEY("post_id","research_id")
);
--> statement-breakpoint
CREATE TABLE "blog_post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "blog_post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "credential_skills" (
	"credential_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	CONSTRAINT "credential_skills_credential_id_skill_id_pk" PRIMARY KEY("credential_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "experience_projects" (
	"experience_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	CONSTRAINT "experience_projects_experience_id_project_id_pk" PRIMARY KEY("experience_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "project_publications" (
	"project_id" uuid NOT NULL,
	"publication_id" uuid NOT NULL,
	CONSTRAINT "project_publications_project_id_publication_id_pk" PRIMARY KEY("project_id","publication_id")
);
--> statement-breakpoint
CREATE TABLE "project_research" (
	"project_id" uuid NOT NULL,
	"research_id" uuid NOT NULL,
	CONSTRAINT "project_research_project_id_research_id_pk" PRIMARY KEY("project_id","research_id")
);
--> statement-breakpoint
CREATE TABLE "project_tags" (
	"project_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "project_tags_project_id_tag_id_pk" PRIMARY KEY("project_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "skill_projects" (
	"skill_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	CONSTRAINT "skill_projects_skill_id_project_id_pk" PRIMARY KEY("skill_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analytics_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "analytics_event_type" NOT NULL,
	"path" text NOT NULL,
	"entity_type" text,
	"entity_slug" text,
	"referrer_host" text,
	"target" text,
	"device" "device_category",
	"browser" text,
	"os" text,
	"country" char(2),
	"visitor_hash" text
);
--> statement-breakpoint
CREATE TABLE "analytics_salts" (
	"day" date PRIMARY KEY NOT NULL,
	"salt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" "contact_status" DEFAULT 'new' NOT NULL,
	"ip_hash" text,
	"notified_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_id" bigint NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"description" text,
	"html_url" text NOT NULL,
	"homepage" text,
	"primary_language" text,
	"languages" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"topics" text[] DEFAULT '{}'::text[] NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"forks" integer DEFAULT 0 NOT NULL,
	"is_fork" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"pushed_at" timestamp with time zone,
	"is_selected" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"custom_description" text,
	"project_id" uuid,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_repositories_githubId_unique" UNIQUE("github_id"),
	CONSTRAINT "github_repositories_counts" CHECK ("github_repositories"."stars" >= 0 AND "github_repositories"."forks" >= 0)
);
--> statement-breakpoint
CREATE TABLE "integration_status" (
	"key" text PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_avatar_media_id_media_id_fk" FOREIGN KEY ("avatar_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_cv_media_id_media_id_fk" FOREIGN KEY ("cv_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_og_image_id_media_id_fk" FOREIGN KEY ("default_og_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_institution_logo_id_media_id_fk" FOREIGN KEY ("institution_logo_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_company_logo_id_media_id_fk" FOREIGN KEY ("company_logo_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_metrics" ADD CONSTRAINT "project_metrics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_project_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."project_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_seo_id_seo_metadata_id_fk" FOREIGN KEY ("seo_id") REFERENCES "public"."seo_metadata"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_presentations" ADD CONSTRAINT "conference_presentations_poster_media_id_media_id_fk" FOREIGN KEY ("poster_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_presentations" ADD CONSTRAINT "conference_presentations_slides_media_id_media_id_fk" FOREIGN KEY ("slides_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_presentations" ADD CONSTRAINT "conference_presentations_research_id_research_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_pdf_media_id_media_id_fk" FOREIGN KEY ("pdf_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_research_id_research_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_seo_id_seo_metadata_id_fk" FOREIGN KEY ("seo_id") REFERENCES "public"."seo_metadata"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research" ADD CONSTRAINT "research_education_id_education_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."education"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research" ADD CONSTRAINT "research_pdf_media_id_media_id_fk" FOREIGN KEY ("pdf_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research" ADD CONSTRAINT "research_poster_media_id_media_id_fk" FOREIGN KEY ("poster_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research" ADD CONSTRAINT "research_slides_media_id_media_id_fk" FOREIGN KEY ("slides_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research" ADD CONSTRAINT "research_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research" ADD CONSTRAINT "research_seo_id_seo_metadata_id_fk" FOREIGN KEY ("seo_id") REFERENCES "public"."seo_metadata"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research" ADD CONSTRAINT "research_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research" ADD CONSTRAINT "research_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_categories" ADD CONSTRAINT "skill_categories_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."skill_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_skill_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."skill_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_providers" ADD CONSTRAINT "credential_providers_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_provider_id_credential_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."credential_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_type_id_credential_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."credential_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_pdf_media_id_media_id_fk" FOREIGN KEY ("pdf_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_related_project_id_projects_id_fk" FOREIGN KEY ("related_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_parent_same_provider_fk" FOREIGN KEY ("parent_id","provider_id") REFERENCES "public"."credentials"("id","provider_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_seo_id_seo_metadata_id_fk" FOREIGN KEY ("seo_id") REFERENCES "public"."seo_metadata"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_categories" ADD CONSTRAINT "blog_post_categories_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_categories" ADD CONSTRAINT "blog_post_categories_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_projects" ADD CONSTRAINT "blog_post_projects_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_projects" ADD CONSTRAINT "blog_post_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_research" ADD CONSTRAINT "blog_post_research_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_research" ADD CONSTRAINT "blog_post_research_research_id_research_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_skills" ADD CONSTRAINT "credential_skills_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_skills" ADD CONSTRAINT "credential_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_projects" ADD CONSTRAINT "experience_projects_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_projects" ADD CONSTRAINT "experience_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_publications" ADD CONSTRAINT "project_publications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_publications" ADD CONSTRAINT "project_publications_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_research" ADD CONSTRAINT "project_research_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_research" ADD CONSTRAINT "project_research_research_id_research_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_projects" ADD CONSTRAINT "skill_projects_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_projects" ADD CONSTRAINT "skill_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD CONSTRAINT "github_repositories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "media_kind_idx" ON "media" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "media_created_idx" ON "media" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "media_checksum_idx" ON "media" USING btree ("checksum_sha256");--> statement-breakpoint
CREATE INDEX "navigation_items_location_idx" ON "navigation_items" USING btree ("location","display_order");--> statement-breakpoint
CREATE INDEX "social_links_order_idx" ON "social_links" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "experiences_order_idx" ON "experiences" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "project_media_project_idx" ON "project_media" USING btree ("project_id","display_order");--> statement-breakpoint
CREATE INDEX "project_metrics_project_idx" ON "project_metrics" USING btree ("project_id","display_order");--> statement-breakpoint
CREATE INDEX "projects_public_idx" ON "projects" USING btree ("status","visibility","featured","display_order");--> statement-breakpoint
CREATE INDEX "projects_category_idx" ON "projects" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "projects_technologies_idx" ON "projects" USING gin ("technologies");--> statement-breakpoint
CREATE INDEX "projects_search_idx" ON "projects" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "conference_presentations_public_idx" ON "conference_presentations" USING btree ("status","presented_on");--> statement-breakpoint
CREATE INDEX "conference_presentations_research_idx" ON "conference_presentations" USING btree ("research_id");--> statement-breakpoint
CREATE INDEX "publications_public_idx" ON "publications" USING btree ("status","visibility","published_on");--> statement-breakpoint
CREATE INDEX "publications_research_idx" ON "publications" USING btree ("research_id");--> statement-breakpoint
CREATE INDEX "publications_doi_idx" ON "publications" USING btree ("doi");--> statement-breakpoint
CREATE INDEX "publications_search_idx" ON "publications" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "research_public_idx" ON "research" USING btree ("status","visibility","featured","display_order");--> statement-breakpoint
CREATE INDEX "research_education_idx" ON "research" USING btree ("education_id");--> statement-breakpoint
CREATE INDEX "research_search_idx" ON "research" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "skill_categories_parent_idx" ON "skill_categories" USING btree ("parent_id","display_order");--> statement-breakpoint
CREATE INDEX "skills_category_idx" ON "skills" USING btree ("category_id","display_order");--> statement-breakpoint
CREATE INDEX "credentials_provider_idx" ON "credentials" USING btree ("provider_id","parent_id","display_order");--> statement-breakpoint
CREATE INDEX "credentials_parent_idx" ON "credentials" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "blog_posts_public_idx" ON "blog_posts" USING btree ("status","visibility","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "blog_posts_search_idx" ON "blog_posts" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "blog_post_categories_category_idx" ON "blog_post_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "blog_post_projects_project_idx" ON "blog_post_projects" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "blog_post_research_research_idx" ON "blog_post_research" USING btree ("research_id");--> statement-breakpoint
CREATE INDEX "blog_post_tags_tag_idx" ON "blog_post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "credential_skills_skill_idx" ON "credential_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "experience_projects_project_idx" ON "experience_projects" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_publications_publication_idx" ON "project_publications" USING btree ("publication_id");--> statement-breakpoint
CREATE INDEX "project_research_research_idx" ON "project_research" USING btree ("research_id");--> statement-breakpoint
CREATE INDEX "project_tags_tag_idx" ON "project_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "skill_projects_project_idx" ON "skill_projects" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "analytics_events_occurred_idx" ON "analytics_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_type_idx" ON "analytics_events" USING btree ("type","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_entity_idx" ON "analytics_events" USING btree ("entity_type","entity_slug");--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contact_messages_created_idx" ON "contact_messages" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "github_repositories_selected_idx" ON "github_repositories" USING btree ("is_selected","display_order");
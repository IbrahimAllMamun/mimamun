# Content model

What the CMS stores, how each type is presented, the rules that keep it
honest, and what the seed provides. Table-level details are in
`database.md`; the editing screens are described in `cms.md`.

## Principles

- **Evidence before claims.** Projects, research, roles and credentials are
  first-class records with their own pages; narrative (statement, bio, focus
  areas) points to them.
- **Nothing invented.** Metrics, dates, IDs, DOIs, findings and employers are
  entered by the owner or left empty. Empty optional fields are omitted from
  the page — never replaced with filler.
- **Structure over free text.** Lists, dates, relations and blocks are
  structured so they can be filtered, linked, cited and marked up (JSON-LD).
- **Month precision.** Career, education, research and credential dates are
  stored as the first day of a month and shown as "Aug 2026".

## Publishing states

| Field           | Applies to                                                                                                              | Meaning                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `status`        | projects, research, publications, presentations, posts                                                                  | `draft` → `published` → `archived`. Only `published` is public; `published_at` is set on first publication              |
| `visibility`    | the same                                                                                                                | `public` (listed everywhere) or `unlisted` (published, reachable by its URL, left out of lists, search and the sitemap) |
| `featured`      | projects, research, publications, presentations, posts, roles, degrees, skills, credentials                             | eligible for the home page and "selected" lists                                                                         |
| `is_visible`    | roles, degrees, skill categories, skills, providers, credentials, social links, focus areas, approach steps, navigation | shown or hidden                                                                                                         |
| `display_order` | ordered collections                                                                                                     | manual order, set with **Reorder**                                                                                      |

Drafts are visible in the admin and through `/preview/{type}/{id}` only.

## Content types

### Profile and site

| Type                | Key fields                                                                                                                                                                               | Shown on                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Profile (singleton) | full name, professional title, statement, short intro, biography (Markdown), research interests, working philosophy, interests, location, public email, availability, portrait, CV (PDF) | home front matter, About, footer, JSON-LD, `/cv`     |
| Social links        | platform, label, URL (http(s) or `mailto:`), order, shown                                                                                                                                | header/footer, About, contact page, JSON-LD `sameAs` |
| Focus areas         | title, description, evidence note, order                                                                                                                                                 | home "Focus"                                         |
| Approach steps      | title, description, evidence, order                                                                                                                                                      | home "Approach"                                      |
| Navigation items    | location (header/footer), label, path or URL, order, shown                                                                                                                               | header and footer                                    |
| Site settings       | site name and description, default social image, footer note, contact form switch and notification address, analytics switch and retention, GitHub username and sync switch              | across the site                                      |
| Route SEO           | per section page: title, description, social image, canonical URL, `noindex`                                                                                                             | metadata (see `seo.md`)                              |

### Career

| Type       | Key fields                                                                                                                                                                                                             | Rules                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Experience | company, logo, company URL, position, department, employment type, location, start, end, current, summary, responsibilities, achievements, metrics (label/value/unit/context), technologies, domains, related projects | a current role has no end date; the end is not before the start; an unknown start is allowed and shown as "start date not recorded" |
| Education  | institution, logo, URL, degree, field of study, location, start, end, current, grade (label, value, scale), final project title, description, courses                                                                  | linked to the research record of its thesis or final project                                                                        |

Experience is ordered current first, then by date. The public pages show the
duration, mark the current role in text and with a marker, and list only the
fields that are filled in.

### Work

| Type                  | Key fields                                                                                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project               | title, slug, summary, type (professional, research, academic, personal), category, role, organisation, dates, technologies, tags, links (GitHub, demo, documentation), cover, gallery, headline metrics, **case-study sections**, related research and publications, SEO |
| Project category, tag | name, slug, description; tags are shared with posts                                                                                                                                                                                                                      |

**Case-study sections** are a fixed, ordered set — Overview, Problem,
Objective, Data, Methodology, Feature engineering, Modeling, Evaluation,
Results, Impact, Challenges, Lessons learned — each holding content blocks.
Empty sections are skipped, and the page's contents navigation lists only the
sections that exist.

### Research

| Type         | Key fields                                                                                                                                                                                                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Research     | title, slug, kind (thesis, academic project, research project, working paper, report), summary, abstract, research question, sections (Data, Methodology, Statistical methods, Models, Findings, Limitations), keywords, methods, authors, degree/programme, institution, supervisor, start/completion, linked degree, PDF, poster, slides, cover, external URL, SEO |
| Publication  | title, authors, type (journal article, conference paper, book chapter, preprint, thesis, report, other), stage (published, in press, accepted, under review, submitted, preprint, working paper), venue, volume, issue, pages, publisher, date, DOI, URL, PDF, abstract, keywords, methodology, findings, citation or BibTeX override, related research, SEO         |
| Presentation | title, type (poster, oral, invited talk, keynote, workshop, panel), conference name, short name and edition, location, date, abstract, poster, slides, event URL, related research                                                                                                                                                                                   |

Research pages generate a citation from the stored fields (the owner's name
emphasised in author lists), which can be copied. Publications show a
formatted citation, BibTeX and DOI links, and never show a stage the owner
did not enter. The Publications page and its navigation item stay hidden
while there are none.

### Skills

A **category tree** (categories can nest to any depth) holding **skills**
with: name, description, an optional qualitative level (Foundational, Working
knowledge, Advanced, Expert), optional years, icon, featured, order and the
projects where the skill was used. There are no percentages or bars; a level
is shown only when recorded. The About page shows the toolkit as a table
with the projects that used each area.

### Certifications

| Type            | Key fields                                                                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider        | name, slug, website, logo, order, shown                                                                                                                                                                  |
| Credential type | name (Specialisation, Track, Course, Certificate, Workshop, … — editable data, not code), order                                                                                                          |
| Credential      | provider, **parent**, type, title, slug, level, description, issue and expiry dates, credential ID and URL, verification URL, certificate image and PDF, related project, skills, featured, order, shown |

Credentials form a tree per provider: a specialisation can contain courses,
which can contain certificates, to any depth. The API refuses a parent from
another provider or a parent that would create a loop. The public page groups
by provider, filters by type while keeping each item's ancestors, and marks
credentials that can be verified.

### Writing

| Type             | Key fields                                                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Post             | title, slug, excerpt, cover, body (content blocks), categories, tags, related projects and research, reading time (computed), status, visibility, featured, publish date, SEO |
| Writing category | name, slug, description, order                                                                                                                                                |

The Writing section and its navigation items stay hidden while there are no
posts.

## Content blocks

Case-study sections, research sections and post bodies are arrays of typed
blocks validated by `packages/shared/src/content/blocks.ts`:

| Block       | Content                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Text        | Markdown (sanitised when rendered)                                                                                                 |
| Heading     | text and level                                                                                                                     |
| Image       | media, alt override, caption, width (text / wide / full)                                                                           |
| Gallery     | images with captions, two or three columns                                                                                         |
| Chart       | title, description, type (line, area, bar, scatter), CSV data, axis labels, number/percent values, optional reference line, source |
| Metrics     | label, value, unit, context                                                                                                        |
| Table       | caption, CSV data (first row is the header), note                                                                                  |
| Code        | language, code, caption                                                                                                            |
| Quote       | text, attribution, source                                                                                                          |
| Callout     | tone, title, Markdown                                                                                                              |
| Methodology | title, steps (each with a title and description)                                                                                   |
| Video       | a YouTube/Vimeo URL (privacy-enhanced embed) or an uploaded video, title, caption                                                  |
| Embed       | an allow-listed dashboard/notebook URL, title, height, caption                                                                     |
| File        | uploaded document, link label, description                                                                                         |
| Divider     | —                                                                                                                                  |

Images, galleries, charts, tables, videos and embeds are numbered in reading
order across a page (Fig. 1, 2, …). Charts must describe real data: the CMS requires a title and
description, and the page offers the data as a table.

## Media

Every uploaded file is a `media` record with a random storage key, original
name, type, size, dimensions, checksum, title, alt text and caption. Content
references media by id; the API tracks where each file is used and refuses to
delete files in use. See `security.md` for upload validation.

## Seeded content

`npm run db:seed` loads only facts from the owner's CV and the owner's own
updates in the project brief. Anything not in those sources is left empty.

| Area           | Seeded                                                                                                                                                                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile        | name, title (Data Scientist), statement, intro and biography restating the facts below, public email                                                                                                                                                                                                            |
| Social links   | GitHub, LinkedIn, email                                                                                                                                                                                                                                                                                         |
| Navigation     | Projects, Research, Experience, About, Contact in the header; Certifications and Search in the footer; Writing and Publications hidden                                                                                                                                                                          |
| Experience     | **City Bank PLC** — Data Scientist, Transformation and Analytics, Credit – Small Business, since **August 2026** (current). **IDLC Finance PLC** — Data Analyst, Products and Business Management, SME, **ended August 2026**; start date not recorded. The CV's "Present" for IDLC is outdated and is not used |
| Education      | University of Dhaka: B.S. in Applied Statistics (2020–2024) and M.S. in Applied Statistics and Data Science (2024–2025), with CGPA and final project titles                                                                                                                                                     |
| Research       | the M.S. project on flood event prediction in Bangladesh with LSTM and GRU networks; the B.S. project on a covariate-dependent Markov model for internal migration to urban areas                                                                                                                               |
| Presentations  | the poster at ICASDS (International Conference on Applied Statistics and Data Science), December 2025                                                                                                                                                                                                           |
| Projects       | the two research projects as case studies with a summary, overview, tags, category and links to their research pages; the remaining sections are left for the owner                                                                                                                                             |
| Skills         | the CV's skill groups (programming, data science, statistics, machine learning, visualisation & BI, databases, web development, DevOps/tools), without levels                                                                                                                                                   |
| Certifications | Coursera: Google Data Analytics. DataCamp: Shiny Fundamentals in R, SQL Fundamentals, Python Data Fundamentals, R Programming Fundamentals. IEEE-CS SBC DU: Workshop on Introduction to Large Language Models. No credential IDs or verification URLs                                                           |
| Settings       | site name and description, contact notification address, GitHub username, route SEO for each section page                                                                                                                                                                                                       |

Deliberately empty until the owner adds them: metrics, findings, abstracts,
supervisors, credential IDs and verification links, the IDLC start date,
publications, posts, the CV file and a portrait.

The seed is idempotent: it inserts missing records and never overwrites
anything edited in the CMS.

# The admin CMS

Everything on the public site is edited at `/admin`. This guide covers what
each part of the CMS does and how it is built. Content types and their fields
are described in `content-model.md`; who may do what is in
`authorization.md`.

## Using the CMS

### Shell

- **Sidebar** grouped by task — Overview, Work, Career, Library, Site,
  Administration. Screens the user has no permission for are hidden. Below
  1024 px the sidebar becomes a drawer; the admin works down to 360 px wide.
- **Global search** (`Ctrl/⌘ K`) finds projects, research, publications,
  posts, roles, degrees, certifications, skills, media and — with
  `messages:manage` — messages, and jumps to the editor.
- **Toasts** confirm saves and report errors; **confirm dialogs** guard
  publishing, deleting and leaving with unsaved changes.
- When the session has expired, the next page load goes to the sign-in page
  with a notice; after signing in the user returns to the page they were
  on.

### Dashboard

Counts per content type with drafts, new messages, **Continue editing**
(recently changed drafts), a **Setup** checklist (CV, portrait, a complete
case study, default social image, SMTP, GitHub), recent messages, recent
activity from the audit log and the last seven days of visits.

### Lists

Every collection has the same list screen:

- text search, status / featured / shown filters, a type or parent filter
  where it applies, sorting and pagination — all kept in the URL;
- checkboxes with **bulk actions** (publish, move to drafts, archive,
  feature, show, hide, delete — whichever apply and the user may use). Bulk
  results report per item, so a partial failure says which records failed and
  why;
- **Reorder** mode for ordered collections: drag and drop or arrow buttons,
  then save;
- hierarchical collections (skill categories, certifications) show a tree
  when unfiltered.

### Editor

- Fields are grouped into titled sections with help text; required fields
  are marked, and validation errors from the API appear next to the field.
- **Slugs** are generated from the title when left empty and shown with the
  public URL prefix.
- **Drafts save themselves**: a saved draft with unsaved changes is saved
  again four seconds after the last edit. `Ctrl/⌘ S` saves at any time.
- **Preview** opens `/preview/{type}/{id}` for projects, research and posts,
  rendering the unpublished version with the public components.
- **Publish**, **Unpublish** and **Archive** are explicit actions with a
  confirmation; the publish date is set on first publication and can be
  edited.
- **Unsaved changes** are protected: in-app links ask before leaving and the
  browser warns on reload or close.
- Records with an SEO group accept a title, description, social image,
  canonical URL and `noindex` override.

### Content blocks

Case-study sections, research sections and posts are made of blocks: text
(Markdown), heading, image, gallery, chart, metrics, table, code, quote,
callout, methodology, video, embed, file and divider. Blocks can be added
anywhere, collapsed, moved up or down, duplicated and removed. Charts take
CSV data and require a title and a description; they render as accessible
SVG with a data-table alternative. Embeds accept only allow-listed hosts (see
`security.md`).

### Media library

Upload by button or drag and drop (images, PDFs, MP4/WebM). Each file has a
title, alt text and caption, shows **Used in** (every record that references
it), can be downloaded, and can be **replaced** in place — all references
follow the new file. Files in use cannot be deleted. Media pickers in forms
open the same library, filtered to the right kind.

### Other screens

| Screen                                                          | Purpose                                                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Messages**                                                    | Contact-form inbox with New / Read / Replied / Archived / Spam tabs, search, bulk read/archive/spam/delete, and reply by email |
| **Analytics**                                                   | Visits, visitors, top pages and content, referrers, devices, downloads and outbound clicks over a chosen period                |
| **Profile & CV**                                                | Name, title, statement, biography, interests, location, public email, availability, portrait and CV                            |
| **Focus areas**, **Approach**, **Navigation**, **Social links** | The small collections behind the home page, header and footer                                                                  |
| **SEO**                                                         | Title, description, social image, canonical URL and `noindex` for each static page                                             |
| **Settings**                                                    | Site name and description, default social image, footer note, contact form, analytics, GitHub                                  |
| **Users**, **Roles**, **Sessions**                              | Accounts, custom roles and their permissions, active sessions with revoke                                                      |
| **Audit log**                                                   | Every administrative action with actor, time and before/after values                                                           |
| **Integrations**                                                | GitHub account, sync status, run a sync, choose and order repositories, custom descriptions, link to projects                  |
| **System**                                                      | Version, uptime, database, migrations, storage and integration health                                                          |
| **Account**                                                     | Change your own password                                                                                                       |

## How it is built

The admin lives in `apps/web/src/app/admin` (routes) and
`apps/web/src/components/admin` (everything else).

- **Server components** check the session (`lib/admin-server.ts`) and load
  the first data; **client components** handle editing. All data goes through
  the API; the admin never touches the database.
- **API client** — `lib/api/client.ts` sends the CSRF token on writes and
  returns the API envelope; `components/admin/use-api.ts` adds loading and
  error state for screens.
- **Resource registry** — `components/admin/resources/registry.ts` describes
  each collection: API path, labels, whether it is editorial, orderable,
  featurable or hideable, list columns and filters, sort options, preview
  type, public URL, initial values, and its form as groups of fields.
  `[resource]/page.tsx` and `[resource]/[id]/page.tsx` render any registered
  resource with `resource-list.tsx` and `resource-editor.tsx`.
- **Form engine** — `components/admin/form/*` renders fields by `kind`
  (text, textarea, markdown, code, number, select, boolean, url, email, slug,
  month, date, datetime, string lists, relation(s), media, repeater, blocks,
  sections, SEO, chart and table data). Values are addressed by dot paths
  (`seo.title`, `metrics.0.value`) so nested data needs no custom code.
  Relation options come from `GET /api/admin/options`.
- **Block editor** — generated from the field definitions in
  `packages/shared/src/content/blocks.ts`, the same module the API uses to
  validate blocks.
- Screens that are not simple collections (dashboard, media, messages,
  analytics, people, settings, SEO, integrations, system) live in
  `components/admin/screens`.

Adding a new collection is described in `development.md`.

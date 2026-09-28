# SEO

Search and sharing metadata are generated from the CMS data on every request,
with editor overrides where they matter. Code: `apps/web/src/lib/seo.ts`,
`apps/web/src/app/sitemap.ts`, `robots.ts`, `manifest.ts`, `icon.tsx`,
`apple-icon.tsx`, `apps/web/src/app/og/[type]/[slug]/route.tsx`.

## Page metadata

Every public page builds its metadata with `pageMetadata()`. Values are taken
in this order:

1. the record's own **SEO override** (projects, research, publications and
   posts have an SEO group in their editor);
2. for section pages, the **route SEO** set on **Admin → SEO** (home, about,
   experience, projects, research, publications, certifications, writing,
   contact, search);
3. the page's own title and summary;
4. the site name and description from **Settings**.

The result includes:

- `<title>` as `Page — Site name` (the home page uses the site name alone);
- the meta description;
- an absolute **canonical URL** built from `APP_URL` (or the override);
- `robots: noindex` when the override or the page asks for it (search
  results always do);
- **Open Graph** (`og:type` website or article, with published and modified
  times and the author for posts; locale `en_GB`) and a **Twitter**
  `summary_large_image` card.

Because `APP_URL` is read at runtime, the same image can be deployed to any
domain.

## Social images

The image for a page is, in order: the SEO override's image, the page's own
image (e.g. a post's cover), a **generated card**, the default social image
from **Settings**, then a generated site card.

Generated cards (`/og/{projects|research|blog|certifications}/{slug}` and
`/og/site/default`) are 1200×630 PNGs rendered with `next/og` in the site's
typography and colours from the record's title, type and metadata. They are
cached like other public data.

## Structured data (JSON-LD)

| Page               | Types                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Home               | `WebSite` and `Person` (name, job title, employer, alumni, profiles, location)                                                                 |
| Project case study | `CreativeWork` (+ `BreadcrumbList`)                                                                                                            |
| Research           | `ScholarlyArticle` with authors (the owner linked to the `Person`), keywords and the institution as `CollegeOrUniversity` (+ `BreadcrumbList`) |
| Writing post       | `BlogPosting` with dates, author and image (+ `BreadcrumbList`)                                                                                |
| Certification      | `EducationalOccupationalCredential` recognised by the issuing `Organization`, linked to the `Person` (+ `BreadcrumbList`)                      |

JSON-LD is inserted with the request's CSP nonce and serialised so content
cannot break out of the script element. Only data stored in the CMS is used;
nothing is inferred.

## Sitemap and robots

- `/sitemap.xml` is generated per request from `GET /api/public/sitemap`:
  the section pages plus every published, public project, research page and
  post, and every visible certification. Records and section pages marked
  `noindex` are left out, as are the writing and publications sections while
  they are empty. `lastModified` comes from the records.
- `/robots.txt` allows everything except `/admin`, `/preview`, `/api/`,
  `/internal/` and `/search`, and points to the sitemap.
- Admin and preview responses also send `X-Robots-Tag: noindex, nofollow`.

## Icons and manifest

`icon.tsx` and `apple-icon.tsx` render the monogram; `manifest.ts` provides
the web app manifest with the site name and theme colours.

## Content practices

- One `<h1>` per page, headings in order, descriptive link text, breadcrumbs
  on detail pages, and internal links between related projects, research,
  roles and credentials.
- Slugs are stable; changing one in the CMS changes the URL, so avoid it for
  published content.
- Summaries double as meta descriptions: keep them to one or two sentences.

## Tests

`apps/web/test/seo.test.ts` checks the precedence rules, absolute URLs and
`noindex`. `e2e/tests/public.spec.ts` checks the sitemap, robots and that
detail pages carry JSON-LD and social metadata.

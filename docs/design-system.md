# Design system

This is the visual and UX system for Ibrahim All-Mamun's portfolio. It was
defined before the interface was built and every component draws from it.
The tokens live in `apps/web/src/styles/tokens.css`; this document explains the
reasoning so future changes stay consistent.

Method note: the `ui-ux-pro-max` skill was used as the review framework
(its priority order: accessibility → touch → performance → style → layout →
type/colour → animation → forms → navigation → charts, and its pre-delivery
checklist). In this environment the skill's searchable palette/font database was
not installed, so palette and type choices below are our own decisions,
checked against its rules (contrast ≥ 4.5:1, 16px base, semantic tokens, no
emoji icons, 44px touch targets). Motion follows the `frontend-ui-animator`
workflow (audit → plan → implement → verify) described in §9.

## 1. Concept: "Working paper"

Ibrahim is an applied statistician working as a data scientist in credit, with
academic research alongside. The site borrows the conventions of a well-typeset
statistical working paper rather than a software landing page:

- **Numbered sections and marginalia** — each section carries a mono label in
  the left margin (`01 — Selected work`) with a small count (`n = 2`). On small
  screens the label moves above the heading.
- **Front matter** — the home page opens like a paper's title block: name,
  one-sentence statement, and an affiliation table (currently / previously /
  trained in / based in) drawn from the database.
- **Figures, not decorations** — visuals are numbered figures with captions. The
  signature figure is the _trajectory_: education, roles and presentations
  plotted on a real time axis from the stored dates. No chart exists without
  data behind it.
- **Rules instead of boxes** — hairline and "booktabs" rules (strong top/bottom,
  thin middle) organise content. Cards are used only where an item is a
  self-contained object (a credential certificate, a media tile in the admin).
- **Colour as encoding** — green marks evidence and primary actions, purple
  marks research/academic material, orange is the single attention colour
  (the "observed point"): focus rings, active states, key markers.

Subtle domain references are allowed (an analytical grid in the hero, dotted
leaders, tabular figures, statistical notation such as `n =`), but never as
gimmicks: no floating formulas, no fake dashboards, no decorative charts.

## 2. Information architecture

```
Home ─┬─ Projects ── /projects/[slug]        (case studies: problem → impact)
      ├─ Research ─┬ /research/[slug]        (theses, research projects)
      │            └ /publications           (hidden from nav until populated)
      ├─ Experience                           (editorial timeline)
      ├─ About (bio, approach, education, skills)
      ├─ Certifications ── /certifications/[slug]  (provider → program → course)
      ├─ Writing /blog ── /blog/[slug]        (hidden from nav until populated)
      ├─ Contact
      └─ CV (download, /cv)
```

Skills and education live inside About because they explain _who_ Ibrahim is;
they are reachable via `/about#skills` and `/about#education` and from the
home page. Navigation items are stored in the database so the owner can show
Writing/Publications when there is content for them.

### Home page narrative (progressive disclosure)

1. **Front matter** — who he is, what he does now, how to act (work, CV, contact).
2. **01 Focus** — what he works on (editable focus areas with evidence notes).
3. **02 Selected work** — featured projects, one large, the rest as an index.
4. **03 Approach** — Statistics → Data → Modeling → Analytics → Research →
   Business impact, each step tied to evidence.
5. **04 Research** — featured research and presentations in citation style.
6. **05 Trajectory** — Fig. 1 timeline + current/previous role summary.
7. **Contact** — closing invitation with direct channels.

Each section links onward; the home page never tries to list everything.

## 3. Typography

| Role                 | Family                           | Settings                                   | Use                                                     |
| -------------------- | -------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| Display              | Newsreader (variable, opsz 6–72) | opsz 72, weight 420, tracking −0.02em      | Name, page titles                                       |
| Heading              | Newsreader                       | opsz 24–36, weight 500                     | Section and entry titles                                |
| Prose                | Newsreader                       | opsz 16, weight 400, 1.7 leading           | Long-form reading (case studies, research, blog, about) |
| Body / UI            | IBM Plex Sans (variable)         | 400/500/600                                | Interface text, summaries, forms, admin                 |
| Metadata / technical | IBM Plex Mono                    | 400/500, uppercase labels +0.06em tracking | Section labels, dates, tags, figures, code              |

Why: Newsreader is an editorial serif with optical sizes, so display cuts
stay crisp and text cuts stay readable. IBM Plex Sans/Mono share a technical,
engineered construction that signals data work without looking like a code
editor. All fonts are self-hosted from `src/fonts` (no third-party requests)
and loaded with `next/font/local` (`display: swap`, fallback metrics adjusted).

### Type scale (fluid, 360px → 1440px)

| Token       | Mobile | Desktop | Typical use                        |
| ----------- | ------ | ------- | ---------------------------------- |
| `text-xs`   | 12px   | 12px    | Mono labels, captions              |
| `text-sm`   | 14px   | 14px    | Metadata, table cells, helper text |
| `text-base` | 16px   | 17px    | Body                               |
| `text-lg`   | 18px   | 20px    | Lead paragraphs, prose             |
| `text-xl`   | 20px   | 24px    | Entry titles                       |
| `text-2xl`  | 24px   | 30px    | Sub-section headings               |
| `text-3xl`  | 28px   | 40px    | Section headings                   |
| `text-4xl`  | 34px   | 52px    | Page titles                        |
| `text-5xl`  | 40px   | 68px    | Home display name only             |

Line length for prose is capped at `68ch`. Numbers in tables and metrics use
`font-variant-numeric: tabular-nums`.

## 4. Colour

All colours are semantic tokens; components never use raw hex values. The
default Tailwind palette is removed so only these tokens exist.

### Light (default)

| Token                | Value     | Contrast on paper | Use                                             |
| -------------------- | --------- | ----------------- | ----------------------------------------------- |
| `paper` (background) | `#F4F2EC` | —                 | Page background, warm neutral                   |
| `surface`            | `#FAF9F5` | —                 | Raised regions, tables                          |
| `elevated`           | `#FFFFFF` | —                 | Dialogs, menus, inputs                          |
| `muted`              | `#EBE8DF` | —                 | Muted surface, code, skeletons                  |
| `ink`                | `#17201B` | 14.9              | Primary text                                    |
| `ink-2`              | `#3D4842` | 8.5               | Secondary text                                  |
| `ink-3`              | `#5C655F` | 5.4               | Muted text, captions (≥ 4.9 on every surface)   |
| `rule`               | `#D6D2C6` | 1.4               | Decorative hairlines only                       |
| `rule-strong`        | `#8C897F` | 3.1               | Input borders, booktabs rules (≥ 3:1 non-text)  |
| `primary`            | `#1F5A44` | 7.2               | Ledger green: links, primary buttons, evidence  |
| `primary-hover`      | `#174534` | 10.8 w/ white     | Button hover                                    |
| `primary-tint`       | `#DCEAE2` | —                 | Selected rows, success backgrounds              |
| `secondary`          | `#5A3A6E` | 8.3               | Aubergine: research/academic markers            |
| `secondary-tint`     | `#ECE3F0` | —                 | Research badges                                 |
| `accent`             | `#A3421A` | 5.6               | Burnt orange text/icons (≥ 5.0 on all surfaces) |
| `accent-mark`        | `#C25A24` | 3.9               | Graphic marks, focus ring (non-text ≥ 3:1)      |
| `accent-tint`        | `#F8E3D6` | —                 | Highlight backgrounds                           |
| `success`            | `#1D6B3E` | 5.8               |                                                 |
| `warning`            | `#855700` | 5.6               |                                                 |
| `error`              | `#B0281F` | 5.9               |                                                 |
| `info`               | `#2D5886` | 6.6               |                                                 |

### Dark

Dark mode follows the system preference and can be overridden with the theme
toggle (stored in a cookie so the server renders the right theme with no flash).

| Token                  | Value                 | Token                    | Value     |
| ---------------------- | --------------------- | ------------------------ | --------- |
| `paper`                | `#0E1411`             | `primary`                | `#86CBA9` |
| `surface`              | `#131A16`             | `secondary`              | `#C7A8DC` |
| `elevated`             | `#19221D`             | `accent` / `accent-mark` | `#F0915E` |
| `muted`                | `#1F2924`             | `success`                | `#74CF9B` |
| `ink`                  | `#E7ECE7` (15.6)      | `warning`                | `#E7B95A` |
| `ink-2`                | `#B5BFB8` (9.9)       | `error`                  | `#F28B82` |
| `ink-3`                | `#8F9A93` (6.4)       | `info`                   | `#8FB6E1` |
| `rule` / `rule-strong` | `#2B3731` / `#5E6B64` |                          |           |

### Data visualisation palette

Categorical series (always paired with a second encoding — marker shape, dash
pattern or direct label):

| #   | Light            | Dark      | Marker            |
| --- | ---------------- | --------- | ----------------- |
| 1   | `#1F5A44` green  | `#86CBA9` | circle, solid     |
| 2   | `#6B4585` purple | `#C7A8DC` | square, dashed    |
| 3   | `#C25A24` orange | `#F0915E` | triangle, dotted  |
| 4   | `#3B6E9C` blue   | `#8FB6E1` | diamond, dash-dot |
| 5   | `#8A6D1F` ochre  | `#D9C07A` | cross             |
| 6   | `#5C655F` grey   | `#8F9A93` | plus              |

All series colours are ≥ 3.9:1 against their background.

## 5. Spacing

Base unit 4px (`--spacing: 0.25rem`); components use the Tailwind scale steps
only. Named layout tokens:

| Token             | Value              | Use                                        |
| ----------------- | ------------------ | ------------------------------------------ |
| `--space-gutter`  | 20px → 48px fluid  | Page side padding                          |
| `--space-section` | 64px → 128px fluid | Vertical rhythm between home/page sections |
| `--space-block`   | 24px → 40px fluid  | Between content blocks in prose            |
| `--measure`       | 68ch               | Prose line length                          |

## 6. Grid

- Container max width `80rem` (1280px) plus gutters.
- **Desktop (≥ 1024px)**: 12 columns, 32px gaps. Editorial default: margin
  column = columns 1–3 (labels, metadata, table of contents), main = 4–12.
- **Tablet (640–1023px)**: 8 columns; the margin column collapses into a
  label row above content; two-column compositions become 5/3 splits.
- **Mobile (< 640px)**: 4 columns; single reading column, horizontal rhythm
  kept through indented metadata and rules rather than stacking cards.

Asymmetry is always grid-aligned: a large item spans 7–8 columns next to a
4–5 column index, never an arbitrary offset.

## 7. Shape, borders, elevation

- Radius: `--radius-xs` 2px (tags, inputs), `--radius-sm` 4px (buttons),
  `--radius-md` 8px (media, dialogs). No pill shapes except status dots.
- Borders: 1px `rule` for separation, 1px `rule-strong` for interactive
  boundaries, 2px `ink` for booktabs top/bottom rules.
- Shadows: only for floating layers — `--shadow-popover` (menus, toasts) and
  `--shadow-dialog`. Content never floats.
- No gradients or glassmorphism. The only texture is the optional analytical
  grid behind the home front matter (opacity ≤ 0.5 of the rule colour).

## 8. Components

Primitives (in `components/ui`): Button (primary / secondary / ghost / danger,
sm / md), TextLink (underline offset animation, optional arrow), Tag (mono,
rectangular), StatusBadge (dot + label, never colour alone), Field set (label,
description, error, control), Input, Textarea, Select, Checkbox, Switch,
Dialog (native `<dialog>`), Toast region (`aria-live`), Tabs, Pagination,
Breadcrumbs, Skeleton, EmptyState, ErrorState, VisuallyHidden, Icon (Lucide,
1.5px stroke).

Editorial components: SectionHeader (margin label + heading + count),
FrontMatter (definition table), Figure (numbered caption), Prose, BlockRenderer,
Chart (line / bar / scatter with data-table fallback), Timeline (trajectory),
ProjectIndex, ResearchEntry (citation style), CredentialTree, SkillMap,
CaseStudyNav (scroll-spy table of contents).

Rules:

- One primary action per view.
- Links look like links (underline), buttons look like buttons (filled or
  outlined). Never style a link as a button to hide navigation semantics.
- Every hover affordance has a `:focus-visible` equivalent.
- Icons always accompany text unless the control has an `aria-label`.

## 9. Motion language (frontend-ui-animator)

Level: **medium**. Motion communicates arrival, hierarchy, state and
continuity; nothing loops, nothing moves on its own after load.

Tokens: `--duration-fast` 150ms, `--duration-base` 220ms, `--duration-slow`
400ms, `--duration-entrance` 600ms; `--ease-out` `cubic-bezier(0.16,1,0.3,1)`,
`--ease-in` `cubic-bezier(0.4,0,1,1)`, `--ease-in-out`
`cubic-bezier(0.65,0,0.35,1)`.

| Component                  | Priority area | Motion                                                                                                                    | Trigger               | Implementation                                                                      |
| -------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| Front matter               | 1 Hero intro  | Staggered fade + 12px rise (name → statement → actions → facts, 70ms steps, capped 420ms); hairline rule draws left→right | Load                  | CSS keyframes                                                                       |
| Text links / index rows    | 2 Hover       | Underline thickens, arrow shifts 3px, row tint                                                                            | Hover + focus-visible | CSS transitions                                                                     |
| Buttons                    | 2 Hover       | Colour 150ms, 1px press                                                                                                   | Hover / active        | CSS                                                                                 |
| Section content            | 3 Reveal      | Fade + 16px rise while entering viewport                                                                                  | Scroll                | CSS scroll-driven animation (`animation-timeline: view()`), progressive enhancement |
| Trajectory bars            | 3 Reveal      | Bars grow from their start date, row stagger                                                                              | Scroll                | Scroll-driven `scaleX`                                                              |
| Charts                     | 3 Reveal      | Lines draw once, bars grow                                                                                                | Scroll                | Scroll-driven stroke offset / `scaleY`                                              |
| Project filter results     | 3 Reveal      | Stagger fade (40ms, capped 320ms) on result change                                                                        | Filter change         | CSS keyed remount                                                                   |
| Page change                | 5 Navigation  | 200ms fade + 4px rise of main content                                                                                     | Route change          | `template.tsx` keyed wrapper                                                        |
| Mobile menu / filter sheet | 5 Navigation  | Panel slide + backdrop fade, 250ms in / 180ms out                                                                         | Click                 | Native `<dialog>` + CSS                                                             |
| Dialogs, toasts            | State         | Scale 0.98→1 + fade; toasts slide 8px                                                                                     | Open / event          | CSS                                                                                 |
| Form feedback              | State         | Inline error fade; button spinner only while pending                                                                      | Submit                | CSS                                                                                 |

Deliberately not used: parallax, magnetic buttons, cursor followers, drifting
gradient blobs, word-by-word headline animation (hurts reading) and count-up
numbers (would dramatise metrics).

Reduced motion: a global `prefers-reduced-motion: reduce` block neutralises
durations, and every reveal is written so that the resting state is visible —
scroll-driven reveals only apply inside
`@media (prefers-reduced-motion: no-preference)` and
`@supports (animation-timeline: view())`, so content is never stuck hidden.

## 10. Interaction principles

- Predictable: the same pattern for the same job everywhere (filters are
  always a GET form enhanced with instant updates; destructive actions always
  use a confirm dialog naming the object).
- URL is state: filters, search, pagination and admin list views are encoded in
  the query string so they can be shared and restored with Back.
- Immediate feedback within 100ms (pressed state), progress for anything over
  400ms (inline pending state or skeleton), and a clear outcome (toast or
  inline confirmation).
- Touch targets are at least 44×44px; spacing between adjacent targets ≥ 8px.

## 11. Accessibility principles

- Semantic landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page,
  sequential headings, skip link to `#main`.
- Visible focus ring: 2px `accent-mark` outline with 2px offset.
- Forms: persistent labels, descriptions via `aria-describedby`, errors next to
  the field and summarised on submit, focus moved to the first invalid field.
- Dialogs use native `<dialog>` (focus containment, Esc to close, focus
  returned to the trigger).
- Charts: `role="img"` with title and description, direct labels, non-colour
  encodings, and a "View data" table.
- Colour contrast verified above; status is never conveyed by colour alone.

## 12. Content presentation strategy

Different content types get different presentation models:

| Content      | Model                                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Project      | Case study: numbered sections (Problem → Data → Method → Model → Evaluation → Result → Impact), metrics strip, figures, sticky contents. |
| Research     | Academic: abstract block, research question, methods, findings, limitations, citation, downloads, where presented.                       |
| Publication  | Bibliographic entry with formatted citation, DOI link, copy-citation.                                                                    |
| Presentation | Event line (type · conference · place · month) with poster/slides.                                                                       |
| Experience   | Editorial timeline with period in the margin, current role marked.                                                                       |
| Credential   | Hierarchy (provider → program → course) with verification details; certificate image as a figure.                                        |
| Skill        | Grouped map by category with optional qualitative level (words, never percentages).                                                      |
| Blog post    | Reading layout, serif prose at 68ch, contents for long posts.                                                                            |

Missing optional content collapses cleanly: empty sections are omitted rather
than rendered with placeholders.

## 13. Admin UI

The admin uses the same tokens at a higher density (`text-sm` base for tables,
compact spacing). Structure: sidebar navigation grouped by Content /
Library / Site / Administration, top bar with breadcrumbs, global search and
account menu; list views with search, filters, sortable columns, pagination
and bulk actions; editors with a main column and a side panel for status,
publishing, organisation and SEO. Toasts confirm actions; destructive actions
require confirmation; unsaved changes are protected.

## 14. Breakpoints and test viewports

Tokens: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.

Visual QA and regression viewports: small mobile 360×740, large mobile
430×932, tablet 820×1180, laptop 1280×800, desktop 1440×900, large desktop
1920×1080.

# Roadmap

Status legend: `[x]` done · `[~]` partly done (see note) · `[ ]` not started.

## Phase 0 — Discovery & design

- [x] Inspect repository and tooling (Node 22, PostgreSQL, Docker, Playwright Chromium)
- [x] Review source material (build brief; CV facts and the owner's updates in the brief)
- [x] Apply design skills (`ui-ux-pro-max` rules, `frontend-ui-animator` workflow)
- [x] Architecture proposal (`docs/architecture.md`)
- [x] Design system proposal (`docs/design-system.md`)
- [x] Database / ERD proposal (`docs/database.md`)
- [x] API proposal (`docs/api.md`)
- [x] `ROADMAP.md`, `CLAUDE.md`, `docs/` structure

## Phase 1 — Architecture

- [x] npm workspaces monorepo (`apps/api`, `apps/web`, `packages/shared`)
- [x] Strict TypeScript, ESLint (flat config), Prettier
- [x] Environment schema (zod, fails fast) + `.env.example` (tested to parse as-is)

## Phase 2 — Database

- [x] Drizzle schema for all entities (46 tables, check constraints, FKs, GIN search indexes)
- [x] Generated SQL migrations + migrator (`db:migrate`, Docker `migrate` service)
- [x] Idempotent seed (CV + owner-provided facts only)

## Phase 3 — Backend

- [x] App skeleton: request id, structured logging with redaction, security headers, error envelope
- [x] Health endpoints (`/api/health`, `/api/health/db`) and system status
- [x] Authentication (Argon2id, server-side sessions, CSRF, lockout, rate limits, password reset)
- [x] Role-based authorization (data-driven roles) + audit log
- [x] Public content APIs (lists, details, search, sitemap, GitHub cache, CV download)
- [x] Admin CRUD APIs via a generic resource router: status workflow, publish guard, reorder, bulk with partial-failure reports
- [x] Media uploads (magic-byte validation, re-encoding, PDF checks, usage tracking, replace in place)
- [x] Contact (validation, honeypot, signed timing token, rate limits, notification)
- [x] Analytics ingestion + summaries (cookie-less, DNT/GPC, daily-salted visitor hash, retention)

## Phase 4 — Design system

- [x] Tokens (colour, type, spacing, radius, shadow, motion, breakpoints) in `tokens.css`
- [x] Self-hosted fonts (Newsreader, IBM Plex Sans, IBM Plex Mono)
- [x] UI primitives and editorial components
- [x] Content block renderers and accessible SVG charts (non-colour encodings, data tables)

## Phase 5 — Public website

- [x] Layout, navigation (CMS-driven), footer, light/dark theme
- [x] Home (front matter, focus, selected work, approach, research, trajectory), About, Experience
- [x] Projects index (search/filter/sort in the URL) and case studies
- [x] Research pages with citations, Publications page, presentations
- [x] Certifications explorer (provider tree, type filter) and detail pages
- [x] Writing index and posts (hidden from navigation until there are posts)
- [x] Contact (works without JavaScript), CV download, site search
- [x] SEO: metadata, Open Graph cards, sitemap, robots, manifest, JSON-LD
- [x] Error, loading, empty and "temporarily unavailable" states

## Phase 6 — Admin CMS

- [x] Auth screens (sign in, forgot/reset password)
- [x] Shell: sidebar/drawer, breadcrumbs, global search, toasts, confirm dialogs
- [x] Dashboard with setup checklist
- [x] Resource list/edit screens for all content (schema-driven registry and form engine)
- [x] Block editor and case-study / research section editor
- [x] Media library (upload, alt text, usage, replace, delete protection)
- [x] Credential and skill hierarchy management
- [x] Messages, users, roles, sessions, audit log, system status, settings, SEO, navigation, integrations, account
- [x] Preview of unpublished content; draft autosave; unsaved-changes guard

## Phase 7 — Integrations

- [x] GitHub repository sync with cache, manual curation and failure isolation
- [x] Email notifications and password-reset mail (SMTP, optional)
- [x] Web revalidation hook (debounced, secret-protected)
- [ ] Publication metadata import (e.g. DOI/Crossref) — not started; publications are entered in the CMS

## Phase 8 — Testing

- [x] Unit tests (shared utilities and schemas, web helpers, API helpers)
- [x] Integration tests (API + PostgreSQL: auth, RBAC, content, public, media, contact, analytics, GitHub)
- [x] Security tests (authorization, CSRF, origin, validation, rate limiting, uploads, headers)
- [x] E2E tests (navigation, admin CRUD/publishing, filtering, certifications, contact, previews)
- [x] Accessibility checks (axe-core, WCAG 2.2 AA rules, light and dark)
- [x] Visual regression at six viewports plus dark mode

## Phase 9 — Security

- [x] Review of headers, CSP (per-request nonce), auth, sessions, uploads and logging
- [x] Sign-in limits count failures only; per-email limit matches the lockout threshold
- [x] Production dependencies: `npm audit --omit=dev` clean (one dev-only advisory documented in `docs/security.md`)

## Phase 10 — Performance

- [x] Layout stability: loading states reserve space (layout shift fixed on streamed pages)
- [x] Fonts: self-hosted variable WOFF2 via `next/font/local`, `swap`, adjusted fallbacks
- [x] Images: `next/image` with explicit sizes; uploads re-encoded and capped at 3200 px
- [x] Data: public API data cached with tag-based revalidation; indexes for slugs, filters and full-text search
- [ ] Automated performance budget (e.g. Lighthouse CI) — not set up

## Phase 11 — Deployment

- [x] Dockerfiles (api, web) + Compose (development profiles; production with Caddy and a migrate service)
- [x] CI workflow (lint, format, types, unit/integration, E2E/a11y/visual, image builds)
- [x] Deployment, backup/restore scripts, update and rollback documentation

## Phase 12 — Final QA

- [x] Visual QA at 360–1920 px (automated baselines plus manual review of every page)
- [x] Documentation matches the implementation (`docs/`, `CLAUDE.md`, this file)
- [x] Definition of done: typed, linted, tested, CI green

## Content still to add (owner)

The code is complete; these need facts only the owner has. The admin
dashboard's setup checklist tracks the first ones.

- Upload the CV (PDF) and a portrait under **Profile & CV**
- Complete the case-study sections (data, methods, evaluation, results) with real figures
- Add research abstracts, findings and supervisors
- Add credential IDs and verification links, and the IDLC start date
- Set a default social sharing image; configure SMTP for notifications
- Add publications and posts when there are some (their navigation items then appear)

## Later (not started)

- Publication metadata import from DOI (Crossref) in the CMS
- Object storage driver (S3-compatible) for media
- Scheduled publishing
- Two-factor authentication for admin accounts
- Shared rate-limit store to allow more than one API instance
- Lighthouse CI performance budget

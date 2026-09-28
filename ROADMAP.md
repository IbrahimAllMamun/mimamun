# Roadmap

Status legend: `[x]` done · `[ ]` not started / open · `[~]` partially done (see note).

## Phase 0 — Discovery & design

- [x] Inspect repository and tooling (Node 22, PostgreSQL 16, Docker, Playwright Chromium)
- [x] Review source material (build brief; CV facts supplied in the brief)
- [x] Apply design skills (`ui-ux-pro-max` rules, `frontend-ui-animator` workflow)
- [x] Architecture proposal (`docs/architecture.md`)
- [x] Design system proposal (`docs/design-system.md`)
- [x] Database / ERD proposal (`docs/database.md`)
- [x] API proposal (`docs/api.md`)
- [x] `ROADMAP.md`, `CLAUDE.md`, `docs/` structure

## Phase 1 — Architecture

- [ ] npm workspaces monorepo (`apps/api`, `apps/web`, `packages/shared`)
- [ ] Strict TypeScript, ESLint, Prettier configuration
- [ ] Environment schema + `.env.example`

## Phase 2 — Database

- [ ] Drizzle schema for all entities
- [ ] Generated SQL migrations + migrator
- [ ] Idempotent seed (CV + owner-provided facts only)

## Phase 3 — Backend

- [ ] App skeleton: request id, structured logging, security headers, error envelope
- [ ] Health endpoints
- [ ] Authentication (Argon2id, sessions, CSRF, lockout, password reset)
- [ ] Role-based authorization + audit log
- [ ] Public content APIs
- [ ] Admin CRUD APIs, status workflow, reorder, bulk
- [ ] Media uploads (magic-byte validation, re-encoding, usage tracking)
- [ ] Contact (validation, honeypot, timing token, rate limit, notification)
- [ ] Analytics ingestion + summaries

## Phase 4 — Design system

- [ ] Tokens (colour, type, spacing, radius, shadow, motion, breakpoints)
- [ ] Self-hosted fonts
- [ ] UI primitives and editorial components
- [ ] Content block renderers and SVG charts

## Phase 5 — Public website

- [ ] Layout, navigation, footer, theme
- [ ] Home, About, Experience
- [ ] Projects index (search/filter/sort) and case studies
- [ ] Research, publications, presentations
- [ ] Certifications explorer and detail
- [ ] Blog index and posts
- [ ] Contact, CV download, search
- [ ] SEO: metadata, OpenGraph, sitemap, robots, JSON-LD
- [ ] Error, loading and empty states

## Phase 6 — Admin CMS

- [ ] Auth screens (login, forgot/reset password)
- [ ] Shell: sidebar, breadcrumbs, global search, toasts, confirm dialogs
- [ ] Dashboard
- [ ] Resource list/edit screens for all content
- [ ] Block editor and case-study section editor
- [ ] Media library
- [ ] Credential and skill hierarchy management
- [ ] Messages, users, roles, sessions, audit log, system status, settings, SEO, navigation
- [ ] Preview of unpublished content

## Phase 7 — Integrations

- [ ] GitHub repository sync with cache and manual curation
- [ ] Email notifications (SMTP, optional)
- [ ] Publication metadata integration interface (documented extension point)

## Phase 8 — Testing

- [ ] Unit tests (shared utilities, validation, business rules)
- [ ] Integration tests (API + PostgreSQL, auth, RBAC)
- [ ] Security tests (authorization, CSRF, validation, rate limiting, uploads)
- [ ] E2E tests (navigation, admin CRUD/publishing, filtering, blog, certificates, contact)
- [ ] Accessibility checks (axe)
- [ ] Visual regression at key breakpoints

## Phase 9 — Security

- [ ] Security review of the full diff (headers, CSP, auth, uploads, logging)

## Phase 10 — Performance

- [ ] Bundle review, image sizing, font loading, query review

## Phase 11 — Deployment

- [ ] Dockerfiles (api, web) + Compose (dev, prod with Caddy)
- [ ] CI workflow
- [ ] Deployment, backup and rollback documentation

## Phase 12 — Final QA

- [ ] Visual QA at all breakpoints + anti-vibe-coding review
- [ ] Documentation matches implementation
- [ ] Definition of done checklist

## Later (not started)

- Publication metadata import from DOI (Crossref) behind the integration interface
- Object storage driver (S3-compatible) for media
- Scheduled publishing
- Two-factor authentication for admin accounts

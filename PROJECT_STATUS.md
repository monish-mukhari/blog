# Inkwell Project Status

This document is the durable source of truth for implementation progress, architectural decisions, deployment state, and next work. Update it whenever a material feature, migration, deployment, or decision changes.

## Snapshot

- Last updated: 2026-10-11
- Current stage: roadmap Phases 0–2 implemented and locally verified; production deployment verification pending
- Latest feature commit: `7e3a112 feat: add public discovery, drafts, story slugs, and SEO`
- Working stack: React, Vite, TypeScript, Hono, Cloudflare Workers, Prisma, Neon PostgreSQL, and Vercel

## Delivery status

| Area              | Status               | Notes                                                                                     |
| ----------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| Product planning  | Complete             | Core publishing and learning experience defined.                                          |
| Database          | Complete             | Neon schema and migrations include drafts, slugs, bookmarks, claps, and follows.          |
| Backend API       | Complete             | Authentication, story management, discovery, interactions, and SEO endpoints implemented. |
| Frontend          | Complete             | Responsive discovery, reading, writing, account, and author-management flows implemented. |
| Local integration | Complete             | Frontend, Worker API, and database exercised together locally.                            |
| Cloudflare Worker | Verification pending | Production URL is configured; complete the production smoke-test checklist below.         |
| Vercel            | Build issue resolved | The shared `common` package dependency installation problem was fixed in Vercel.          |
| Production QA     | Pending              | Verify all critical paths against the deployed frontend and Worker.                       |

## Original roadmap progress

| Roadmap phase                                 | Progress        | Current assessment                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 — Product and technical foundation    | Complete        | Repeatable migrations, environment configuration, restricted CORS, structured errors/logging, optional monitoring delivery, automated tests, and CI are implemented.                                                                                                                                            |
| Phase 1 — Public reading, discovery, and SEO  | Complete in code | Public discovery, sorting, compact feeds, canonical edge rendering, metadata, JSON-LD, social images, sitemap, RSS, and crawler controls are implemented. Production deployment and Search Console indexing verification remain operational steps.                                                                |
| Phase 2 — Complete publishing workflow        | Complete        | Structured Markdown, previews, cross-device drafts, safe published edits, unpublishing, deletion, duplication, scheduling, revisions, processed media, captions, alt text, and unload protection are implemented.                                                                                                |
| Phase 3 — Learning-focused reading            | Not started     | No table of contents, progress tracking, learning metadata, series, recommendations, private notes, or quizzes yet.                                                                                                                                                                                               |
| Phase 4 — Profiles and healthy community      | Early partial   | Follow/unfollow exists, but profiles, following feed, comments, notifications, moderation, reporting, muting, and blocking do not.                                                                                                                                                                                |
| Phase 5 — Trust, security, and administration | Not started     | PBKDF2 password hashing and protected routes exist, but verification, reset, safer sessions, revocation, rate limits, roles, moderation, legal flows, deletion, and export remain.                                                                                                                                |
| Phase 6 — Scale, quality, and growth          | Early partial   | Database indexes and Prisma Accelerate exist. Accessibility automation, end-to-end tests, analytics, backups, subscriptions, import/export, and multilingual support remain.                                                                                                                                      |

### Detailed phase checklist

Legend: ✅ complete · 🟡 partially complete · ⬜ not started

#### Phase 0 — Product and technical foundation

- ✅ First-release product boundary and publication workflow are defined.
- ✅ Expanded Prisma schema and additive migrations are implemented.
- ✅ API errors use a stable `{ error: string }` format, with codes and request IDs on unhandled errors.
- ✅ Public optional authentication and protected mutation handling are established as route middleware and guards.
- ✅ Runtime configuration uses environment variables and committed example files.
- ✅ CORS is restricted by the configured `FRONTEND_URL`, with localhost allowed for development.
- ✅ Backend unit and route tests cover routing, authorization, list parsing, slugs, summaries, and safe Markdown rendering.
- ✅ GitHub Actions CI verifies shared types, Prisma generation, backend tests/types, frontend formatting/linting, and production builds on Node 20.
- ✅ Structured JSON request and error logging includes request IDs, status, duration, and stack context.
- ✅ Optional authenticated external error-webhook delivery is implemented through Worker environment variables.

**Success criterion:** met. Migrations and core API behavior are tested and repeatable.

#### Phase 1 — Public reading, discovery, and SEO

- ✅ Published feed and individual published-story endpoints are public.
- ✅ Optional authentication enriches public responses with bookmark, appreciation, and follow state.
- ✅ Publishing, saving, appreciating, and following remain protected.
- ✅ Stories receive unique, readable slugs.
- ✅ Public story URLs use `/story/:slug`; this is singular rather than the originally proposed `/stories/:slug`.
- ✅ Pagination and server-side search/topic filtering are implemented.
- ✅ Results can be sorted by newest, oldest, or most appreciated.
- ✅ Feed responses contain previews instead of complete story bodies.
- ✅ Browser metadata, Open Graph fields, and canonical tags are implemented.
- ✅ Structured `Article` data is included in server-rendered canonical story HTML.
- ✅ Dynamic sitemap, `robots.txt`, and RSS are implemented.
- ✅ The Worker supplies crawler-friendly share HTML and canonical edge-rendered story HTML.
- ✅ Direct canonical story requests are server-rendered through a Vercel-to-Worker rewrite.
- ✅ Story cover images and a generated fallback bitmap provide Open Graph and Twitter preview images.
- 🟡 Search Console submission and confirmed indexing remain production operational tasks because search engines control indexing.

**Success criterion:** met in the application. Logged-out visitors can find, open, share, sort, and search server-rendered stories. Production indexing must be monitored after deployment.

#### Phase 2 — Complete publishing workflow

- ✅ Server-side drafts are implemented.
- ✅ The **My Stories** dashboard lists drafts and published stories.
- ✅ Local draft recovery and account synchronization are implemented.
- ✅ A structured Markdown editor with formatting controls is implemented.
- ✅ Headings, links, lists, quotations, code blocks, images, captions, and alt text are supported and safely rendered.
- ✅ A dedicated preview uses the same renderer as the public reader.
- ✅ Published stories are edited through private edit drafts so incomplete changes never alter the live story.
- ✅ Unpublish is implemented.
- ✅ Authors can delete their own drafts and stories.
- ✅ Duplication, five-minute scheduled publishing, schedule cancellation, and revision recovery are implemented.
- ✅ Cover and inline images are resized, compressed, validated, stored, and served with immutable caching.
- ✅ Changes are backed up locally immediately, synced to the server, and protected by a browser unload warning.

**Success criterion:** met. Authors can manage the complete structured life of a story across devices.

#### Phase 3 — Learning-focused reading

- ⬜ Generated table of contents
- ⬜ Reading progress and continue-reading state
- ⬜ Learning outcomes, prerequisites, difficulty, references, and last-reviewed date
- ⬜ Ordered learning series
- ⬜ Related stories and prerequisite/next-step recommendations
- ⬜ Private highlights and notes
- ⬜ End-of-article questions or quizzes

**Success criterion:** not started.

#### Phase 4 — Profiles and healthy community

- ⬜ Editable public author profiles and author archives
- 🟡 Follow/unfollow is implemented, but there is no dedicated following feed.
- ⬜ Threaded comments, replies, mentions, and author moderation
- ⬜ In-app notifications and configurable email digests
- ⬜ Report, mute, and block functionality

**Success criterion:** not met. A basic follow relationship exists, but the community system has not been built.

#### Phase 5 — Trust, security, and administration

- ⬜ Email verification and password reset
- 🟡 Passwords use PBKDF2 hashing, but authentication still uses a seven-day token stored in `localStorage`.
- ⬜ Safer cookie-based session handling, session revocation, and device/session management
- ⬜ Login and publishing rate limits and bot protection
- 🟡 Basic password length validation exists; a complete password policy does not.
- ⬜ Roles, moderation queue, editorial review, featured-story selection, and audit logs
- ⬜ Complete Terms, Privacy, account deletion, and data export flows

**Success criterion:** not met. Basic authentication exists, but the planned trust and administration system has not started.

#### Phase 6 — Scale, quality, and growth

- 🟡 Database indexes and Prisma Accelerate exist; broader caching, image delivery, and query monitoring do not.
- ⬜ Automated component accessibility tests
- ⬜ End-to-end user-journey tests
- ⬜ Privacy-conscious product metrics
- ⬜ Backup verification and restoration drills
- ✅ RSS publishing exists.
- ⬜ Newsletter subscriptions
- ⬜ Content import/export
- ⬜ Multilingual support

**Success criterion:** not met. A few data-access foundations exist, but scale and growth work has not begun as a complete phase.

### Exact next starting point

Phases 0–2 are complete in the codebase and passed local integration smoke testing. The next work is a **deployment closure**, followed by roadmap Phase 3:

1. Deploy the updated Worker, including its cron trigger and monitoring variables.
2. Deploy the Vercel frontend and verify the canonical story rewrite.
3. Complete and record the production smoke-test checklist.
4. Submit the production sitemap in Google Search Console and monitor indexing.
5. Begin Phase 3 with semantic headings and generated tables of contents, then add reading progress and learning metadata.

## Implemented capabilities

### Reading and discovery

- Public homepage and story feed
- Pagination, search, topic filtering, and saved-story filtering
- Story excerpts, topics, dates, and reading-time estimates
- Readable `/story/:slug` URLs with legacy `/blog/:id` support
- Loading, empty, error, expired-session, and not-found states

### Authoring

- Create, update, publish, and delete stories
- Local automatic draft recovery
- Account-synced server drafts
- Author-only **My Stories** dashboard
- Draft-to-published workflow
- Markdown formatting and safe rendering
- Live story preview
- Processed cover and inline images with captions and alternative text
- Private edit drafts for published stories
- Unpublishing, duplication, and scheduled publishing
- Revision snapshots and recovery
- Immediate local backup and unsaved-change protection

### Accounts and community

- Signup and sign-in
- PBKDF2 password hashing and seven-day JWT sessions
- Protected author routes
- Bookmarks, appreciations, and author following
- Native sharing with clipboard fallback

### Engineering quality

- Shared Zod request schemas
- Prisma migrations and indexed story queries
- Backend utility and routing tests
- GitHub Actions continuous integration
- Structured request/error logging and optional monitoring webhook
- TypeScript, ESLint, and Prettier configuration
- Environment examples and deployment documentation
- Beginner-focused SEO implementation and maintenance guide with visual request-flow diagrams
- Credentials excluded from Git

## SEO implementation

### Discoverable URLs

Every published story has a unique database-backed slug and a canonical frontend URL:

```text
/story/<slug>
```

The previous ID-based route remains available for old links, but new links and generated SEO documents use the slug route.

### Base document metadata

`frontend/index.html` supplies the default site title, description, Open Graph fields, Twitter card type, theme color, and RSS discovery link. These values describe Inkwell before React loads and act as fallbacks for non-story pages.

### Per-story browser metadata

When a story loads, `frontend/src/lib/metadata.ts` updates:

- Document title and description
- Canonical URL
- Open Graph type, title, description, and URL
- Twitter card type
- Author name
- Article publication time

The metadata is restored when the story component unmounts so it does not leak into another client-side route.

### Crawler-friendly share pages

Some social crawlers do not execute client-side React. The Worker therefore exposes:

```text
/share/<slug>
```

This endpoint reads the published story from PostgreSQL and returns complete HTML containing story metadata, an `Article` JSON-LD object, and a canonical link. It then redirects human visitors to the canonical `/story/<slug>` page. New shares use the canonical story URL directly because Vercel rewrites direct requests to the Worker's edge renderer; `/share/<slug>` remains compatible with older links.

### Sitemap and RSS

The Worker generates these documents directly from published database records:

- `/sitemap.xml` lists the home page, discovery page, and every published story with its last-modified date.
- `/rss.xml` contains the latest 50 published stories with titles, descriptions, authors, dates, and canonical links.

Vercel rewrites both public paths to the Worker, so crawlers and feed readers can access them on the frontend domain.

### Crawl controls

`frontend/public/robots.txt` permits public crawling and excludes private authoring routes such as `/publish`, `/write/`, and `/stories/mine`.

### Current SEO limitations

- Direct canonical story requests are edge-rendered, while in-app story navigation uses the interactive React reader.
- Search-engine verification, analytics, and production structured-data validation are not yet recorded.
- The generated fallback social bitmap is shared by stories without an uploaded cover image.
- Search engines ultimately decide whether and when a technically eligible story is indexed or ranked.

## Production smoke-test checklist

The equivalent local integration run passed on 2026-10-11: health, signup, media upload, draft synchronization, scheduling and cancellation, publishing, canonical edge rendering, safe published editing, revision restore, duplication, unpublishing, republishing, sitemap, RSS, and cleanup all succeeded against the Neon database.

- [ ] Worker `/health` returns HTTP 200.
- [ ] Signup and sign-in work on the deployed frontend.
- [ ] A draft autosaves, reloads, and publishes.
- [ ] Published stories open by slug in a private browser session.
- [ ] Search, topics, and pagination return correct results.
- [ ] Bookmark, appreciation, and follow actions persist.
- [ ] `/sitemap.xml` contains the production frontend origin and published stories.
- [ ] `/rss.xml` returns valid RSS using the production frontend origin.
- [ ] `/share/<slug>` contains story-specific metadata and redirects correctly.
- [ ] Cloudflare CORS permits the production Vercel origin and rejects unrelated origins.
- [ ] Vercel deep links such as `/story/<slug>` and `/signin` load without a 404.

## Recommended next phases

1. Deploy the Worker and frontend, then complete and record the production smoke tests.
2. Submit the sitemap to Google Search Console and monitor indexing.
3. Start Phase 3 with generated tables of contents and reading-progress persistence.
4. Add learning outcomes, prerequisites, difficulty, references, and reviewed dates.
5. Add ordered series and related/prerequisite/next-step recommendations.
6. Add automated frontend accessibility and end-to-end coverage alongside Phase 3.

## Maintenance rules

After material work, update this file in the same commit:

1. Change the snapshot date and current stage.
2. Update the delivery table.
3. Move completed work into **Implemented capabilities**.
4. Record new migrations, routes, environment requirements, and architectural decisions.
5. Add unresolved risks or limitations explicitly.
6. Update the production checklist with verified results.
7. Never place passwords, database URLs, API keys, JWT secrets, or other credentials here.

Git history remains the authoritative record of code changes; this document provides the human-readable project context and current operational state.

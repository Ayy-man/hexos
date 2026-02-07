# hexOS Build History and Roadmap

**Project:** hexOS - Project Management Portal for Hexona's DFY Automation Business
**Repository:** hexos-main
**Last Updated:** 2026-02-06

---

## 1. BUILD HISTORY

### Overview

hexOS went through 13 phases of v1.0 polish work between January 19 and February 1, 2026. The polish roadmap was created from production testing feedback and organized into phases with a clear dependency graph. 11 of 13 phases were completed; 2 remain planned (Phase 09: Suggestion Box Expansion was completed despite the original ROADMAP.md marking it as planned, and Phase 12: Offboarding Flow Design remains not started).

---

### Phase 01: Critical Bugs - Storage & Server Actions
**Goal:** Fix blocking production bugs preventing core workflows
**Completed:** 2026-01-20
**Plans:** 2

**What was delivered:**
- Fixed RLS policies for the `general-purpose` storage bucket, unblocking case study image uploads and suggestion box screenshot uploads
- Fixed DFY "suggest changes" server action that failed with "failed to extract deliverables" error
- Introduced structured server action results pattern (`{ data?, error? }` instead of throwing)

**Key technical decisions:**
- Return `{ data?, error? }` from server actions instead of throwing, because Next.js production builds scrub error details from thrown exceptions
- Log full error details server-side before returning clean messages to users
- Empty AI extraction results are not errors; return `{ deliverables: [] }` and let UI show info toast

**Commits:** `84f6613`, `951c17f`, `9060c9b`, `80f45ab`

---

### Phase 02: Code Cleanup
**Goal:** Remove unused placeholder features to reduce maintenance burden
**Completed:** 2026-01-20
**Plans:** 1

**What was delivered:**
- Removed team section (placeholder) from codebase
- Removed time reports section (unused) from codebase
- Cleaned up navigation, command palette, breadcrumbs, and revalidatePath references

**Key technical decisions:**
- Combined 3 cleanup tasks into a single cohesive commit
- Kept `getAllDevs` in `admin-reports.ts` because it is used by the `/admin/devs` page
- Established dead route cleanup pattern: when removing routes, also clean navigation, command palette, breadcrumbs, and revalidatePath

**Commits:** `139abb8`

---

### Phase 03: Form Input Fixes
**Goal:** Fix number input UX issues across the entire app
**Completed:** 2026-01-20
**Plans:** 2

**What was delivered:**
- Fixed blueprint pricing tier number inputs (0-prefix issue when typing "250" showed "0250")
- Added $50 step to price fields across the app
- Fixed textarea newline handling so Enter creates new lines
- App-wide currency input audit across 10 files for consistency

**Key technical decisions:**
- Use `type="text"` + `inputMode="decimal"` for currency inputs instead of `type="number"` to prevent leading zero issues
- Keep `estimatedHours` as `type="number"` since small integers have fewer leading zero problems
- Use `regex replace(/[^0-9.]/g, '')` for input sanitization

**Commits:** `4eff661`, `829d929`, `484e7b7`

---

### Phase 04: Branding & PDF Polish
**Goal:** White-label ready proposal exports
**Completed:** 2026-01-20 (verified same day)
**Plans:** 1

**What was delivered:**
- Removed all hexOS branding from PDF proposal exports ("Powered by hexOS", "Questions? Contact your representative")
- Removed hexOS branding from public web proposal view
- Moved "Mark as closed" button to prominent position in header next to share/download
- Verified role-appropriate pricing visibility (DFY users don't see client pricing)

**Key technical decisions:**
- Remove all platform branding unconditionally (not conditional on partner logo), making exports fully white-labeled

**Commits:** `3a29adc`

---

### Phase 05: Sidebar & Dashboard Polish
**Goal:** Improve navigation UX and data accuracy
**Completed:** 2026-01-20
**Plans:** 3

**What was delivered:**
- Reordered sidebar navigation: Blockers moved first in Admin group for high-priority visibility
- Synced DFY "My Projects" dashboard cards to hill chart progress percentage instead of showing incorrect deliverable counts (0/7)
- Added hover tooltips to inquiries sidebar item showing color-coded status counts (working, ready, on-hold)

**Key technical decisions:**
- Import and reuse existing `calculateHillChartProgress` from projects feature
- Combined stages for tooltip: "working" = working + in_queue + admin_reviewed
- Tooltip total excludes closed and lost (active pipeline only)

**Commits:** `042c80d`, `32ed350`, `bb65488`

---

### Phase 06: Blueprints & Case Studies
**Goal:** Add Loom support and bidirectional relationships
**Completed:** 2026-01-20 (verified same day)
**Plans:** 3

**What was delivered:**
- Added `loom_url` column to blueprints and case studies tables (database migration)
- Created `LoomVideoEmbed` component with responsive 16:10 iframe embedding
- Added Loom URL input fields to blueprint and case study forms with live preview
- Built `RelatedCaseStudies` sidebar component on blueprint detail pages
- Conditional visibility: Loom embeds only appear when URL is present

**Key technical decisions:**
- Manual type definitions in API layer (project pattern, no generated Supabase types)
- `LoomVideoEmbed` returns `null` for invalid URLs (graceful degradation)
- 16:10 aspect ratio (paddingBottom 62.5%) to match Loom default dimensions
- `RelatedCaseStudies` returns `null` when empty (no placeholder, clean UI)
- Loom video placed in main content area, related case studies in sidebar

**Commits:** `4f56c84`, `d21d847`, `2ac867e`, `5278d09`, `0d6a1aa`, `fb4ede3`, `4b31039`, `b77400e`

---

### Phase 07: Finance Tab Redesign
**Goal:** Reduce cognitive load with better information hierarchy
**Completed:** 2026-01-20 (verified same day)
**Plans:** 2

**What was delivered:**
- Restructured FinancialsTab into 3 logical sections: Revenue, Costs, Timeline
- Compact card layout with `py-3` pattern matching admin page design system
- Conditional color coding: green for positive, red for negative, orange for warning
- 5-column grid for Revenue, 4-column for Costs and Timeline

**Key technical decisions:**
- Match card count to grid columns per section
- Use `cn()` with ternary operators for conditional green/red/orange color variants

**Commits:** `044497d`, `2d479a5`

---

### Phase 08: Testing Tab Polish
**Goal:** Reliability and positioning improvements
**Completed:** 2026-01-20 (verified same day)
**Plans:** 1

**What was delivered:**
- Fixed testing tab reliability with project-scoped queue loading
- Correct tab positioning: after Progress tab and before Files tab
- Added error state with retry UI pattern

**Key technical decisions:**
- Server-side filtering over client-side for efficiency and data freshness
- Optional `projectId` parameter for project-scoped queries (maintains backward compatibility)

**Commits:** `b3157c5`, `9fac606`

---

### Phase 09: Suggestion Box Expansion
**Goal:** Full suggestion management for DFY/Dev users
**Completed:** 2026-01-31
**Plans:** 3

**What was delivered:**
- Database migration: suggestion conversation infrastructure with trigger, RLS, types, and backfill
- API functions for suggestion conversations and status change notifications
- `/my-suggestions` page with suggestion list, status badges (new/reviewed/implemented/declined), and detail sheet
- Per-suggestion conversation threads using existing ChatPanel component
- Sidebar navigation links for dev and DFY roles

**Key technical decisions:**
- Follow inquiry conversation pattern exactly for consistency
- Use Sheet component (slide from right) for suggestion details instead of modal or new page
- Reuse existing ChatPanel for conversation threads (DRY, consistent UX, realtime support)
- Route suggestion notifications to `/my-suggestions` dedicated URL
- Trigger notification only when status field is in update input (prevents duplicates on admin_notes-only updates)

**Commits:** `91f1d4a`, `7e9eac0`, `f5d8678`, `adf98f3`, `2260e0f`

---

### Phase 10: Opportunities Overhaul
**Goal:** Developer bidding system and AI-powered briefs
**Completed:** 2026-01-20
**Plans:** 5

**What was delivered:**
- **Bidding system:** Full database schema (bids table), API module, BidForm/BidCard/BidList components, admin bid review with dropdown actions, optimistic UI with rollback
- **AI redacted briefs:** OpenRouter + Claude 3.5 Haiku integration with structured tool calling, brief cache with SHA256 hash invalidation and 7-day TTL, RedactedBriefCard component with complexity color coding
- **Pre-commitment flow:** Commitment status tracking (interested/committed/not_interested), toggle actions with safeguards (prevents accidental uncommit), PreCommitmentTab with RadioGroup and notes
- **Dashboard integration:** Dev opportunities page at `/dashboard/dev/opportunities`, admin OpportunityDetailModal with 4 lazy-loaded tabs (Details, Bids, Brief, Committed Devs)
- **Duration overhaul:** Changed estimated hours to estimated weeks (DECIMAL 3,1 for half-week precision), `formatDuration()` helper with priority fallback chain, weeks input on opportunity creation form

**Key technical decisions:**
- DECIMAL(3,1) for weeks estimates to allow half-week precision (e.g., 2.5 weeks)
- SHA256 input hash for brief cache to detect source data changes
- 7-day default TTL for AI briefs (balance cache freshness with AI cost savings)
- Keep `estimated_hours` alongside weeks for backward compatibility
- Extended existing OpportunityCard instead of creating new DevOpportunityCard (DRY)
- Lazy loading for admin tabs (data fetched only when tab activated)
- Redact client names, prices, URLs, addresses from AI briefs; keep industry, problem type, tech stack

**Commits:** `66d71a7`, `d81ee92`, `b929b4b`, `37d7376`, `6579d73`, `4fac77d`, `1e75c29`, `791fc0a`, `34821cb`, `5588d45`, `1789395`, `66ce2c1`, `7590abe`, `3b5fbd0`, `34a711e`, `628bf5c`

---

### Phase 11: Notification System Audit
**Goal:** Reliable, non-repetitive notifications
**Completed:** 2026-01-20 (verified same day)
**Plans:** 2

**What was delivered:**
- Database-backed toast deduplication with `shown_as_toast_at` column and partial index
- Fixed `useNotificationsRealtime` hook: initial load toast spam eliminated
- Client-side `markNotificationsAsToastShown` function using fire-and-forget pattern
- 5-minute time window for initial toast display (prevents old notifications appearing as urgent)
- Comprehensive documentation of all 27 notification triggers across 9 source files

**Key technical decisions:**
- Database-backed toast tracking over client-side storage (works across tabs and page refreshes)
- Partial index with dual NULL filter for optimal query performance
- Triple filter for toast eligibility: `!read_at && !shown_as_toast_at && recent`
- `void` keyword for fire-and-forget Supabase updates (TypeScript compatible with PromiseLike)

**Commits:** `b683ebc`, `aca4655`, `44c7bb0`, `336e509`

---

### Phase 12: Offboarding Flow Design
**Goal:** Define post-completion experience
**Status:** Not started

This phase is a design-only spec to document what happens after a project is marked complete. No implementation work has been done. Deprioritized because it does not block soft launch.

---

### Phase 13: Email Delivery with Resend
**Goal:** Enable actual email delivery for all transactional emails
**Completed:** 2026-02-01
**Priority:** CRITICAL (launch blocker)
**Plans:** 2

**What was delivered:**
- Resend SDK integration replacing console.log stubs in `lib/api/email.ts`
- Email client singleton pattern at `lib/email/resend.ts`
- 4 professionally styled React Email templates:
  - Invitation email (admin, internal, dev, DFY roles) with CTA button and URL fallback
  - Application received confirmation
  - Application approved with "get started" link
  - Application rejected with professional messaging
- `sendEmail` updated to render React components to HTML via `@react-email/components render()`
- All 8 invitation/application action points wired to send emails on success
- Environment variable configuration (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`)

**Key technical decisions:**
- Used pnpm for installation due to npm cache permission issues
- Made `renderEmailTemplate` async since React Email `render()` returns Promise
- Handle Supabase join results that may return array or object depending on query cardinality
- Configurable sender with `RESEND_FROM_EMAIL` env or fallback to default hexOS address

**Commits:** `a23f855`, `aab07b9`, `1c285b5`, `a614973`, `86308ae`, `1149992`

---

### Major Milestones

| Date | Milestone | Details |
|------|-----------|---------|
| 2026-01-03 | Database RLS crisis and recovery | Database recovered from recursive RLS function crisis; safe function patterns documented to prevent recurrence |
| Jan 2026 | Pulse/time tracking removal | Pulse system and time tracking features removed as overengineered; may return redesigned in future iteration |
| 2026-01-19 | Polish roadmap created | 20 items from production testing organized into 13 phases with dependency graph |
| 2026-01-20 | Phases 01-08, 10-11 completed | Bulk of polish work completed in a single day: critical bugs, cleanup, form fixes, branding, sidebar, blueprints, finance, testing tab, opportunities overhaul, notification audit |
| 2026-01-20 | Opportunities overhaul completed | Developer bidding system, AI-powered redacted briefs, pre-commitment flow, hours-to-weeks conversion |
| 2026-01-20 | Notification toast deduplication | Database-backed deduplication eliminating duplicate pop-ups across tabs and page refreshes |
| 2026-01-31 | Suggestion Box Expansion completed | My Suggestions page, per-suggestion conversations, status tracking |
| 2026-02-01 | Email delivery with Resend | Invitations and application notifications now send real emails via Resend with React Email templates |
| 2026-02-02 | Critical blockers cleared | All critical blockers resolved or deprioritized; project declared ready for soft launch |

---

## 2. CURRENT STATE

### Shipped and Working Capabilities

The following capabilities are validated and working in production:

**Core Workflow:**
- Multi-step inquiry form with AI Copilot
- Proposal pipeline with 10-stage Kanban board
- Full project lifecycle (22 statuses, 7 phases)
- Project initiation wizard with hierarchical requirements
- Deliverables negotiation with counter offers and approval workflow

**Content & Collaboration:**
- Rich text documents (Plate.js) with comments, suggestions, discussions
- Conversations with bidirectional sync to inquiry comments
- Blueprints and case studies catalog with Loom video support
- Related case studies on blueprint pages

**Developer Experience:**
- Developer skills/XP system with badges
- Daily dev check-ins with position tracking
- Delay tracking and extension requests
- Developer bidding system for opportunities
- Pre-commitment flow for opportunity interest tracking
- AI-generated redacted briefs (client info protected, tech stack visible)
- Suggestion box with per-suggestion conversation threads

**User Management:**
- Role-based dashboards (Admin, Internal, Dev, DFY, Client)
- Invitation system with organization creation
- Dev application self-signup with approval workflow
- Email delivery for invitations via Resend with React Email templates
- Application notification emails (received, approved, rejected)

**Finance & Payments:**
- Stripe backend (webhooks, invoice API)
- Dev payouts with wire transfer workflow
- Redesigned finance tab with Revenue/Costs/Timeline sections

**UX & Polish:**
- DFY proposal reminders with snooze system
- Command palette (Cmd+K) global search
- Mobile responsive layouts
- Notification center UI (bell icon, popover, realtime, full page)
- Toast notification deduplication (database-backed)
- White-label proposal exports (PDF and web)

### Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| AI Copilot form state sync | Needs testing | Fields may not visually update; may be edge case |
| Payout admin actions missing role check | Mitigated | Layout protection in place; actions should add `requireRole()` |

Previously known issues that have been resolved:
- DFY invoice query broken with FK alias (PGRST error) -- FIXED
- Admin metrics SQL functions use invalid enum value -- FIXED

### What Was Deprioritized and Why

| Item | Reason |
|------|--------|
| Client invitation flow | Not needed for v1 soft launch; admin can manage clients directly |
| Mercury payout execution | Manual payout process sufficient for initial launch volume |
| Public invoice payment page | Invoices handled through existing Stripe integration |
| Time tracking | Removed as overengineered; may return redesigned in future iteration |
| Phase 12: Offboarding Flow | Design-only work; not blocking any user workflow |

### Soft Launch Readiness Assessment

**Status: READY FOR SOFT LAUNCH**

All critical blockers have been cleared as of 2026-02-02. The platform covers the full lifecycle from inquiry to delivery with:
- Working email delivery for user onboarding (invitations and applications)
- Stable notification system without duplicate toasts
- Clean, white-labeled proposal exports
- Functional developer bidding and opportunity management
- Role-appropriate dashboards with accurate data

The remaining polish items (listed in the roadmap below) are quality-of-life improvements that can be shipped incrementally after launch.

---

## 3. ROADMAP AHEAD

### Active Polish Items (Can Launch Without)

These items improve the experience but do not block soft launch:

| Item | Description | Complexity |
|------|-------------|------------|
| Email notifications for stage changes and reminders | Send emails when proposal stages change, project milestones hit, or reminders are due | Moderate |
| Gantt view for deliverables | Visual timeline of deliverables with dependencies and progress tracking | Complex |
| Scope monitoring system | Baseline scope capture, change detection, approval workflow for scope modifications | Complex |
| External portals polish | Dev, DFY, and client portal experience improvements (navigation, onboarding, empty states) | Moderate |
| RequirementsTab migration | Migrate RequirementsTab from inline data to `onboarding_requirements` table | Moderate |
| Deliverables sign-off flow | Formal sign-off process for completed deliverables with client approval | Moderate |
| Invoice management UI improvements | Better invoice listing, filtering, and status tracking for admin | Moderate |

### Pending Phases

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| Phase 09 | Suggestion Box Expansion | COMPLETED | Originally marked as planned but was completed on 2026-01-31 |
| Phase 12 | Offboarding Flow Design | Not Started | Design spec only; defines post-project completion experience |

### Future Iteration Ideas (Out of Scope for v1)

These ideas are tracked for future development but are explicitly out of scope for the initial launch:

**Near-term possibilities:**
| Idea | Description |
|------|-------------|
| Client invitation flow | Allow DFY partners or admins to invite their clients directly into the portal |
| Mercury payout execution | Automate developer payouts through Mercury banking API |
| Public invoice payment page | Self-service invoice payment page for clients without requiring login |

**Platform expansion:**
| Idea | Description |
|------|-------------|
| A2UI agent-generated UIs | AI agents that dynamically generate UI components based on user needs |
| Interactive proposal builder | Client-facing proposal builder with drag-and-drop customization |
| BaigWork marketplace | Public marketplace for developer talent and project opportunities |
| WhatsApp integration | Bidirectional messaging sync between hexOS and WhatsApp |
| AI scope creep detection | Automated detection of scope changes using AI analysis of conversations and deliverables |
| Multi-tenant white-labeling | Custom subdomains and branding per organization (e.g., `acme.hexos.app`) |
| Agreement/contract phase with e-signatures | Legal agreement workflow with document generation and e-signature integration |

### Technical Debt and Improvements

| Item | Priority | Notes |
|------|----------|-------|
| Payout role checks | Low | Add `requireRole()` to payout admin actions (currently mitigated by layout protection) |
| AI Copilot form sync | Low | Test and fix potential form state sync issue in multi-step inquiry form |
| Time tracking redesign | Deferred | Was removed as overengineered; if reintroduced, should be simpler and more focused |

---

## Appendix: Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + TypeScript strict mode |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| UI | shadcn/ui (Vega style, Stone+Cyan theme, Figtree font) |
| Payments | Stripe (webhooks, invoice API) |
| Rich Text | Plate.js (JSONB storage) |
| Email | Resend + React Email |
| AI | OpenRouter + Claude 3.5 Haiku (opportunity briefs) |
| Deployment | Vercel |

## Appendix: Architecture Patterns Established

Key patterns established during the 13-phase polish that guide future development:

- **Structured server action results:** Return `{ data?, error? }` instead of throwing
- **Currency input:** `type="text"` + `inputMode="decimal"` + regex sanitization
- **Toast deduplication:** Database-backed `shown_as_toast_at` column with partial index
- **Conversation type extension:** ALTER TYPE + column + unique index + trigger + RLS function update + backfill
- **AI brief generation:** OpenRouter + structured tool calling with SHA256 cache invalidation
- **Email templates:** React Email components with inline styles, consistent color palette, preview text
- **Lazy tab loading:** Fetch data only when tab is activated via useEffect
- **White-label exports:** Remove platform branding unconditionally from all client-facing outputs
- **Fire-and-forget updates:** `void supabase.update()` for non-blocking database writes

---

*Generated: 2026-02-06*
*Source: .planning/PROJECT.md, .planning/ROADMAP.md, .planning/FINAL-POLISH-ROADMAP.md, .planning/STATE.md, .planning/PHASE-DEPENDENCIES.md, and phase summary files*

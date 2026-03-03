# hexOS Roadmap

## Milestones

- **v1.0 Polish** — Phases 01-16 (shipped 2026-02-26) | [Archive](milestones/v1.0-ROADMAP.md)

<details>
<summary>v1.0 Polish (Phases 01-16) — SHIPPED 2026-02-26</summary>

- [x] Phase 01: Critical Bugs (2/2 plans)
- [x] Phase 02: Code Cleanup (1/1 plan)
- [x] Phase 03: Form Input Fixes (2/2 plans)
- [x] Phase 04: Branding & PDF Polish (1/1 plan)
- [x] Phase 05: Sidebar & Dashboard Polish (3/3 plans)
- [x] Phase 06: Blueprints & Case Studies (3/3 plans)
- [x] Phase 07: Finance Tab Redesign (2/2 plans)
- [x] Phase 08: Testing Tab Polish (1/1 plan)
- [x] Phase 09: Suggestion Box Expansion (3/3 plans)
- [x] Phase 10: Opportunities Overhaul (5/5 plans)
- [x] Phase 11: Notification System Audit (2/2 plans)
- [x] Phase 12: Offboarding Flow Design (design only)
- [x] Phase 13: Email Delivery with Resend (2/2 plans)
- [x] Phase 14: Offboarding & Retainer System (5/5 plans)
- [x] Phase 15: Meeting Assistant (7/7 plans)
- [x] Phase 16: Notification Coverage Overhaul (5/5 plans)

</details>

---

## v1.1 Performance

- [ ] Phase 17: Performance Optimization (6 work streams)
  - WS-1: Caching & Auth Dedup
  - WS-2: Bundle & Dynamic Imports
  - WS-3: Loading States
  - WS-4: Waterfall Fixes
  - WS-5: Re-render Fixes
  - WS-6: CSS & Animation Fixes

---

## v1.2 UX Enrichment

- [x] Phase 18: Rich Activity Timeline (completed 2026-03-02)
  - Upgrade both Activity Timeline (full tab) and Recent Activity (overview card) with rich inline details per activity type
  - Category-specific icons + color accents for visual differentiation (status, deliverables, documents, hill chart, files, team, etc.)
  - Toggleable filter chips (All, Status, Deliverables, Documents, Hill Chart, Files, Team)
  - Show entity names, field-level diffs (old → new), zone labels, file names, and truncated previews inline
  - Client-side filtering on already-loaded activity data

- [x] Phase 19: Enhanced Sidebar Hover Previews with Drill-Down Navigation (completed 2026-03-02)
  - Add second-layer drill-down to existing tooltip stat rows (Inquiries, Projects, Conversations, Suggestions) — hover a count row to see actual item names
  - Make every entity name in tooltips a clickable Link for direct navigation
  - Add new hover cards for Meetings, Blueprints, Case Studies, and Blockers sidebar items
  - Fetch additional data (item names/titles) to power the drill-down lists
  - Pinnable tooltips (click to keep open) for comfortable reading and clicking
  - **Plans:** 3 plans
    - [x] 19-01-PLAN.md — API functions + Route Handler for drill-down data (completed 2026-03-03)
    - [ ] 19-02-PLAN.md — PinnableHoverCard component + upgrade existing 4 tooltips
    - [ ] 19-03-PLAN.md — 4 new hover cards (Meetings, Blueprints, Case Studies, Blockers) + visual verification

- [ ] Phase 20: Onboarding Bento Grid + Expandable Sheets
  - Replace flat onboarding tab with a bento grid dashboard of minimal preview cards
  - Each card opens an expandable sheet (~90% viewport) via ResponsiveDialog with URL state (?section=)
  - Admin builds onboarding forms: categories with mixed question types (text, textarea, select, multi_select, boolean) and requirements
  - DFY partner fills out categories at their own pace with auto-save (blur + debounce + save-on-close)
  - Admin monitors answer progress with completion rings per category and inline answer previews
  - Role-aware UI: same page adapts for admin (build + monitor) and DFY (fill out)
  - New tables: onboarding_categories, onboarding_questions, onboarding_answers
  - No Stepperize — bento grid + sheets replace stepper pattern
  - **Plans:** 6 plans
    - [ ] 20-01-PLAN.md — DB migration (3 tables + RLS) + API layer + server actions (Wave 1)
    - [ ] 20-02-PLAN.md — Bento grid UI + data pipeline + URL state + progress hooks (Wave 2)
    - [ ] 20-03-PLAN.md — Category question sheet with auto-save form + DFY flow (Wave 3)
    - [ ] 20-04-PLAN.md — Admin form builder: inline add, reorder, preview toggle (Wave 3)
    - [ ] 20-05-PLAN.md — Deliverables + Requirements expandable sheets (Wave 4)
    - [ ] 20-06-PLAN.md — Completion flow + post-onboarding state + visual verification (Wave 5)

- [ ] Phase 21: Blocker Queue Redesign
  - Replace dense card-dump admin blocker queue with scannable minimal cards + slide-over sidebar
  - Minimal blocker cards: priority color bar, title, description preview, status badge, project, time, comment count, reporter
  - Click card opens Sheet (40vw right) with Overview + Conversation tabs
  - Overview tab: full blocker detail, meta, description, inline resolve (no dialog), inline delete confirm, status transitions, escalate to DFY
  - Conversation tab: chat-like threaded comments with avatars, timestamps, edit/delete, Enter-to-send composer
  - Same experience for all roles (admin, dev, DFY) — trust-based, no role gating
  - Remove resolve dialog and comment dialog — replaced by inline sidebar interactions
  - Add getAllBlockers API + getBlockerCommentsAction server action for client-side comment fetching
  - No database changes needed — uses existing blocker_comments table and APIs
  - **Plans:** 2 plans
    - [ ] 21-01-PLAN.md — API layer (getAllBlockers + getBlockerCommentsAction) + presentational components (BlockerCard + BlockerConversation)
    - [ ] 21-02-PLAN.md — BlockerSidebar + AdminBlockerQueue rewrite + page wire-up + visual verification

- [x] Phase 22: Inquiry Multi-Select Blueprints + Case Studies (completed 2026-03-03)
  - Add case studies as selectable items alongside blueprints in the "I've closed a deal" / proposal intake form
  - Replace single-select blueprint dropdown with multi-select supporting both blueprints and case studies
  - New junction table `inquiry_selections` (item_type, blueprint_id, case_study_id) for many-to-many
  - Keep `inquiries.blueprint_id` as primary/first blueprint for backwards compatibility with 14+ downstream consumers
  - Update form components: ClosedBlueprint (A1), VariationProposal (B2), ClosedCustom (A3) paths
  - Update form schema, types, and submission logic to handle array of selections
  - Update inquiry detail page to display multiple blueprints + case studies
  - Update downstream consumers: project conversion, proposal deliverables, realtime hooks, list/table/board views
  - Fetch case studies in intake form page alongside blueprints

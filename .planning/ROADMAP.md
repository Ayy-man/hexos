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

- [ ] Phase 19: Enhanced Sidebar Hover Previews with Drill-Down Navigation
  - Add second-layer drill-down to existing tooltip stat rows (Inquiries, Projects, Conversations, Suggestions) — hover a count row to see actual item names
  - Make every entity name in tooltips a clickable Link for direct navigation
  - Add new hover cards for Meetings, Blueprints, Case Studies, and Blockers sidebar items
  - Fetch additional data (item names/titles) to power the drill-down lists
  - Pinnable tooltips (click to keep open) for comfortable reading and clicking
  - **Plans:** 3 plans
    - [x] 19-01-PLAN.md — API functions + Route Handler for drill-down data (completed 2026-03-03)
    - [ ] 19-02-PLAN.md — PinnableHoverCard component + upgrade existing 4 tooltips
    - [ ] 19-03-PLAN.md — 4 new hover cards (Meetings, Blueprints, Case Studies, Blockers) + visual verification

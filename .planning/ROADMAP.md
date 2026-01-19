# hexOS Final Polish Roadmap

**Milestone:** v1.0 Polish
**Created:** 2026-01-19
**Source:** Production testing feedback

---

## Phases

### Phase 01: Critical Bugs - Storage & Server Actions
**Goal:** Fix blocking production bugs preventing core workflows
**Status:** Planned
**Plans:** 2 plans

Fix RLS policies for storage uploads (case study images, suggestion screenshots) and debug the DFY "suggest changes" server action that fails with "failed to extract deliverables".

**Delivers:**
- Working case study image upload
- Working suggestion box upload + submit
- Working DFY "suggest changes" with AI extraction

Plans:
- [ ] 01-01-PLAN.md — Storage RLS policies for general-purpose bucket
- [ ] 01-02-PLAN.md — Server action error handling for deliverable extraction

---

### Phase 02: Code Cleanup
**Goal:** Remove unused placeholder features to reduce maintenance burden
**Status:** Planned
**Plans:** 1 plan

Remove team section (placeholder) and time reports section (unused). Clean up navigation, API functions, and any related code.

**Delivers:**
- Team section removed from codebase
- Time reports section removed from codebase
- Cleaner navigation

Plans:
- [ ] 02-01-PLAN.md — Delete unused pages, update navigation, clean API functions

---

### Phase 03: Form Input Fixes
**Goal:** Fix number input UX issues across the entire app
**Status:** Planned
**Plans:** 2 plans

Fix blueprint pricing tier number inputs (0-prefix issue), add $50 step to price fields, fix textarea newline handling. Audit all number inputs app-wide for consistency.

**Delivers:**
- Number inputs clear properly
- Price fields step by $50
- Textarea accepts Enter for new lines
- Consistent number input behavior

Plans:
- [ ] 03-01-PLAN.md — Fix critical blueprint form inputs (PricingTiersEditor + BlueprintForm)
- [ ] 03-02-PLAN.md — App-wide currency input audit (10 files)

---

### Phase 04: Branding & PDF Polish
**Goal:** White-label ready proposal exports
**Status:** Planned
**Plans:** 1 plan

Remove hexOS branding from PDF exports (conditional on partner logo), move "Mark as closed" button to prominent position in header, and verify role-appropriate pricing visibility.

**Delivers:**
- Clean PDF exports without branding (when partner has logo)
- Better proposal action placement
- Role-appropriate pricing visibility

Plans:
- [ ] 04-01-PLAN.md — Conditional PDF/web branding and Mark as Closed button relocation

---

### Phase 05: Sidebar & Dashboard Polish
**Goal:** Improve navigation UX and data accuracy
**Status:** Planned
**Plans:** 3 plans

Reorder sidebar (blockers higher), add hover tooltips with status counts to inquiries tab, sync DFY project cards to hill chart progress percentage.

**Delivers:**
- Better sidebar organization
- At-a-glance inquiry status
- Accurate DFY progress display

Plans:
- [ ] 05-01-PLAN.md — Reorder sidebar navigation (Blockers first in Admin group)
- [ ] 05-02-PLAN.md — Sync DFY dashboard to hill chart progress
- [ ] 05-03-PLAN.md — Add inquiry status tooltips to sidebar

---

### Phase 06: Blueprints & Case Studies
**Goal:** Add Loom support and bidirectional relationships
**Status:** Planned
**Plans:** 3 plans

Add Loom video URL fields to blueprints and case studies (conditional visibility), show related case studies on blueprint pages.

**Delivers:**
- Loom video support for blueprints
- Loom video support for case studies
- Related case studies section on blueprints

Plans:
- [ ] 06-01-PLAN.md — Database migration, API layer, and Loom utilities
- [ ] 06-02-PLAN.md — LoomVideoEmbed component and form updates
- [ ] 06-03-PLAN.md — RelatedCaseStudies component and blueprint page integration

---

### Phase 07: Finance Tab Redesign
**Goal:** Reduce cognitive load with better information hierarchy
**Status:** Planned
**Plans:** 2 plans

Redesign metrics/finance tab with narrower cards, clear visual hierarchy, and logical groupings (Revenue, Costs, Timeline).

**Delivers:**
- Redesigned finance tab
- Better visual hierarchy
- Logical metric groupings

Plans:
- [ ] 07-01-PLAN.md — Restructure FinancialsTab into 3 sectioned groups (Revenue, Costs, Timeline)
- [ ] 07-02-PLAN.md — Polish color coding, responsive layout, and visual verification

---

### Phase 08: Testing Tab Polish
**Goal:** Reliability and positioning improvements
**Status:** Planned
**Plans:** 1 plan

Fix testing tab reliability issues, position it after Progress tab and before Files tab when enabled.

**Delivers:**
- Reliable testing queue loading
- Correct tab positioning

Plans:
- [ ] 08-01-PLAN.md — Fix tab ordering, add project-scoped queue loading, add error handling UI

---

### Phase 09: Suggestion Box Expansion
**Goal:** Full suggestion management for DFY/Dev users
**Status:** Planned
**Plans:** 3 plans

Create suggestion list page for DFY/Dev, add conversation threads per suggestion with admin, trigger notifications without polluting general conversations.

**Delivers:**
- Suggestion list page
- Per-suggestion conversations
- Scoped notifications

**Dependencies:** Phase 01 (suggestion box upload must work first)

Plans:
- [ ] 09-01-PLAN.md — Database migration for suggestion conversations (type, trigger, RLS, backfill)
- [ ] 09-02-PLAN.md — API functions for suggestion conversations and notifications
- [ ] 09-03-PLAN.md — My Suggestions page, components, and sidebar navigation

---

### Phase 10: Opportunities Overhaul
**Goal:** Developer bidding and AI-powered briefs
**Status:** Not started

Change hours to weeks, add post-project opportunity creation with expiry, developer bidding system, pre-commitment tab, AI-generated redacted briefs with caching.

**Delivers:**
- Bidding system for developers
- Pre-commitment flow
- AI redacted briefs
- Cached extractions

---

### Phase 11: Notification System Audit
**Goal:** Reliable, non-repetitive notifications
**Status:** Not started

Map all notification triggers, fix reliability issues, prevent seen notifications from re-appearing as pop-ups.

**Delivers:**
- Notification trigger documentation
- Reliable notification delivery
- No duplicate pop-ups

---

### Phase 12: Offboarding Flow Design
**Goal:** Define post-completion experience
**Status:** Not started

Brainstorm and document what happens after a project is marked complete. Design spec for future implementation.

**Delivers:**
- Offboarding flow specification

---

## Summary

| Phase | Name | Complexity | Dependencies |
|-------|------|------------|--------------|
| 01 | Critical Bugs | Moderate | None |
| 02 | Code Cleanup | Trivial | None |
| 03 | Form Fixes | Moderate | None |
| 04 | Branding/PDF | Trivial | None |
| 05 | Sidebar/Dashboard | Moderate | None |
| 06 | Blueprints/Case Studies | Moderate | Phase 05 |
| 07 | Finance Redesign | Moderate | Phase 05 |
| 08 | Testing Tab | Moderate | None |
| 09 | Suggestion Box | Moderate | Phase 01 |
| 10 | Opportunities | Complex | Phase 06 |
| 11 | Notifications | Moderate | Phase 05 |
| 12 | Offboarding | Design | None |

---

*12 phases for v1.0 polish milestone*

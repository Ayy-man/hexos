# hexOS Final Polish Roadmap

**Milestone:** v1.0 Polish
**Created:** 2026-01-19
**Source:** Production testing feedback

---

## Phases

### Phase 01: Critical Bugs - Storage & Server Actions
**Goal:** Fix blocking production bugs preventing core workflows
**Status:** Not started

Fix RLS policies for storage uploads (case study images, suggestion screenshots) and debug the DFY "suggest changes" server action that fails with "failed to extract deliverables".

**Delivers:**
- Working case study image upload
- Working suggestion box upload + submit
- Working DFY "suggest changes" with AI extraction

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
**Status:** Not started

Fix blueprint pricing tier number inputs (0-prefix issue), add $50 step to price fields, fix textarea newline handling. Audit all number inputs app-wide for consistency.

**Delivers:**
- Number inputs clear properly
- Price fields step by $50
- Textarea accepts Enter for new lines
- Consistent number input behavior

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
**Status:** Not started

Reorder sidebar (blockers higher), add hover tooltips with status counts to inquiries tab, sync DFY project cards to hill chart progress percentage.

**Delivers:**
- Better sidebar organization
- At-a-glance inquiry status
- Accurate DFY progress display

---

### Phase 06: Blueprints & Case Studies
**Goal:** Add Loom support and bidirectional relationships
**Status:** Not started

Add Loom video URL fields to blueprints and case studies (conditional visibility), show related case studies on blueprint pages.

**Delivers:**
- Loom video support for blueprints
- Loom video support for case studies
- Related case studies section on blueprints

---

### Phase 07: Finance Tab Redesign
**Goal:** Reduce cognitive load with better information hierarchy
**Status:** Not started

Redesign metrics/finance tab with narrower cards, clear visual hierarchy, and logical groupings (Revenue, Costs, Timeline).

**Delivers:**
- Redesigned finance tab
- Better visual hierarchy
- Logical metric groupings

---

### Phase 08: Testing Tab Polish
**Goal:** Reliability and positioning improvements
**Status:** Not started

Fix testing tab reliability issues, position it after Progress tab and before Files tab when enabled.

**Delivers:**
- Reliable testing queue loading
- Correct tab positioning

---

### Phase 09: Suggestion Box Expansion
**Goal:** Full suggestion management for DFY/Dev users
**Status:** Not started

Create suggestion list page for DFY/Dev, add conversation threads per suggestion with admin, trigger notifications without polluting general conversations.

**Delivers:**
- Suggestion list page
- Per-suggestion conversations
- Scoped notifications

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

# Project State

**Milestone:** v1.0 Polish
**Repository:** hexos-main
**Last Updated:** 2026-01-20

---

## Current Position

Phase: 06 of 12 (blueprints-case-studies)
Plan: 02 of 3 (COMPLETE)
Status: In progress
Last activity: 2026-01-19 - Completed 06-02-PLAN.md

Progress: [==================----------------] 58%
         Phase 02: 01 complete
         Phase 03: 01, 02 complete (verified)
         Phase 05: 01, 02, 03 complete
         Phase 06: 01, 02 complete
         Phase 07: 01 complete
         Phase 08: 01 complete (verified)

## Completed Work

| Phase | Plan | Summary | Commit |
|-------|------|---------|--------|
| 02-code-cleanup | 01 | Remove unused placeholder features (team, time reports) | 139abb8 |
| 03-form-input-fixes | 01 | Blueprint form input fixes (pricing tiers, base price) | 4eff661 |
| 03-form-input-fixes | 02 | Apply currency input pattern to all HIGH priority files | 829d929, 484e7b7 |
| 05-sidebar-dashboard | 01 | Reorder sidebar navigation (Blockers first) | 042c80d |
| 05-sidebar-dashboard | 02 | Sync DFY dashboard to hill chart progress | 32ed350 |
| 05-sidebar-dashboard | 03 | Inquiry status tooltips for sidebar | bb65488 |
| 06-blueprints-case-studies | 01 | Database & API foundation for Loom video support | 4f56c84, d21d847, 2ac867e |
| 06-blueprints-case-studies | 02 | LoomVideoEmbed component and form integration | 5278d09, 0d6a1aa, fb4ede3 |
| 07-finance-tab-redesign | 01 | Finance tab 3-section layout with compact cards | 044497d, 2d479a5 |
| 08-testing-tab-polish | 01 | Testing tab reorder, project-scoped queue, error UI | b3157c5, 9fac606 |

## Accumulated Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 03-01 | Use type="text" + inputMode="decimal" for currency inputs | Prevents leading zero issue (typing "250" shows "0250" with type="number") |
| 03-01 | Keep estimatedHours as type="number" | Small integers have less leading zero problems |
| 03-01 | Use regex replace(/[^0-9.]/g, '') for sanitization | Only allows numbers and decimal point |
| 03-02 | Keep qty input as type="number" | Small integers don't have leading zero issues |
| 05-01 | Blockers first in Admin group | High-priority items should be visible first |
| 05-02 | Import calculateHillChartProgress from projects feature | Reuse existing hill chart calculation logic |
| 06-01 | Manual type definitions in API layer | Project pattern - no generated Supabase types |
| 06-01 | Empty string valid for isValidLoomUrl | Optional field handling |
| 06-02 | LoomVideoEmbed returns null for invalid URLs | Graceful degradation, no broken iframes |
| 06-02 | 16:10 aspect ratio (paddingBottom 62.5%) | Matches Loom default video dimensions |
| 06-02 | Live preview only when URL is non-empty AND valid | Clear feedback for user |
| 07-01 | 5-column grid for Revenue, 4-column for Costs/Timeline | Match card count to grid columns |
| 07-01 | Conditional color coding: green positive, red negative, orange warning | Clear financial status at a glance |
| 07-01 | Compact card py-3 pattern | Consistent with admin page design system |
| 02-01 | Combined 3 tasks into single commit | Tasks form cohesive dead code removal |
| 02-01 | Kept getAllDevs in admin-reports.ts | Function used by /admin/devs page |
| 05-03 | Combined stages for tooltip: working = working + in_queue + admin_reviewed | Show active work in single "Working" count |
| 05-03 | Total excludes closed and lost | Active pipeline only for quick status check |
| 08-01 | Server-side filtering over client-side | More efficient, reduces data transfer, prevents stale data |
| 08-01 | Optional parameter for project-scoped queries | Maintains backward compatibility while enabling scoping |

## Patterns Established

| Pattern | Description | First Used |
|---------|-------------|------------|
| Currency input | type="text" + inputMode="decimal" + regex sanitization | 03-01 |
| Textarea Enter key | onKeyDown with stopPropagation for Enter | 03-01 |
| Sectioned KPI layout | Section header (icon + label) + grid of compact cards | 07-01 |
| Compact stat card | Card className="py-3" with p-0 px-4 CardContent | 07-01 |
| Conditional color styling | cn() with ternary for green/red/orange variants | 07-01 |
| Dead route cleanup | When removing routes, also clean navigation, command palette, breadcrumbs, revalidatePath | 02-01 |
| Loom URL validation | Regex pattern for share/embed URLs with optional params | 06-01 |
| Rich sidebar tooltip | Custom tooltip content for sidebar items with additional data | 05-03 |
| Conditional badge | Show badge only when count > 0 | 05-03 |
| Project-scoped queries | Optional projectId parameter to filter at server level | 08-01 |
| Error state with retry | useState for error, clear before try, set in catch, Button to retry | 08-01 |
| Responsive iframe embed | paddingBottom % on parent + absolute positioning on iframe | 06-02 |
| Optional form validation | const isValid = !value \|\| validateFn(value) for optional fields | 06-02 |

## Blockers/Concerns

None currently.

## Session Continuity

Last session: 2026-01-19T18:42:43Z
Stopped at: Completed 06-02-PLAN.md
Resume file: None

---

*Auto-updated by plan executor*

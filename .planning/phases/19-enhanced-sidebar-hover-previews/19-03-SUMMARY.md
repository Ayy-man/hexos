---
phase: 19-enhanced-sidebar-hover-previews
plan: "03"
subsystem: ui
tags: [sidebar, hover-preview, popover, react, nextjs, meetings, blueprints, case-studies, blockers]

# Dependency graph
requires:
  - phase: 19-02
    provides: PinnableHoverCard, DrillDownRow components, sidebar hover preview pattern
  - phase: 19-01
    provides: getUpcomingMeetings, getBlueprintStatusCounts, getCaseStudyStatusCounts, getActiveBlockerCountsByPriority API functions
provides:
  - MeetingsHoverContent component showing upcoming meetings with date/time and clickable links
  - BlueprintHoverContent component with draft/published counts and DrillDownRow
  - CaseStudyHoverContent component with draft/published counts and DrillDownRow
  - BlockerHoverContent component with severity-coded counts (critical/high/medium/low)
  - Critical blocker badge on Blockers sidebar item
  - Contextual empty states for all 4 new hover cards
  - Expanded Promise.all in layout.tsx with 4 new server-side queries
affects: [app-sidebar, dashboard-layout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extend PinnableHoverCard pattern by adding hover content component and wiring in items.map() if/else chain"
    - "Meetings hover card shows items directly (no drill-down) since each meeting IS the entity"
    - "Blueprints/CaseStudies use DrillDownRow for lazy name fetch on status hover"
    - "Blockers use conditional rendering (only show non-zero severity rows) to keep popover concise"

key-files:
  created: []
  modified:
    - app/(dashboard)/layout.tsx
    - components/app-sidebar.tsx

key-decisions:
  - "Meetings hover card only shows when meetingsSummary.length > 0 (no empty state on sidebar — use contextual message inside component)"
  - "Blueprints and Case Studies show hover card even with total=0 (empty state message is inside component)"
  - "BlockerHoverContent uses conditional rendering per severity — only renders rows with count > 0 to avoid visual noise"
  - "Critical blocker badge uses bg-red-500 override (not variant) to ensure distinct red color vs default badge"

patterns-established:
  - "Hover card gating: Meetings gates on data.length > 0; Blueprints/CaseStudies/Blockers gate only on prop existence (truthy)"
  - "New hover cards slot into existing if/else chain before the if (tooltipContent) render path"

requirements-completed:
  - SIDE-NEW-CARDS
  - SIDE-EMPTY-STATES

# Metrics
duration: 12min
completed: 2026-03-02
---

# Phase 19 Plan 03: New Sidebar Hover Cards Summary

**4 new hover content components (Meetings, Blueprints, Case Studies, Blockers) complete the 8-item sidebar hover preview system, with severity-coded blocker counts, empty states, and server-side data fetching wired via layout.tsx Promise.all**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-02T20:07:21Z
- **Completed:** 2026-03-02T20:19:27Z
- **Tasks:** 2/3 (Task 3 is checkpoint:human-verify)
- **Files modified:** 2

## Accomplishments
- Added 4 new server-side API calls to dashboard layout's Promise.all (meetings, blueprints, case studies, blockers)
- Created MeetingsHoverContent showing up to 3 upcoming meetings with formatted date/time and clickable navigation links
- Created BlueprintHoverContent and CaseStudyHoverContent with draft/published counts using DrillDownRow for lazy name drill-down
- Created BlockerHoverContent with severity-coded rows (critical/high/medium/low), only rendering non-zero counts
- Added red critical-count badge on Blockers sidebar item when criticalCount > 0
- All 4 components have contextual empty state messages
- TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Add server-side data fetching and new props** - `9429544` (feat)
2. **Task 2: Create 4 new hover content components and wire to sidebar items** - `6b88090` (feat)
3. **Task 3: Verify all 8 sidebar hover previews visually** - awaiting checkpoint:human-verify

## Files Created/Modified
- `app/(dashboard)/layout.tsx` - Added 4 new imports + 4 new Promise.all entries + 4 new AppSidebar props
- `components/app-sidebar.tsx` - Added 4 new hover content components + wired in items.map() if/else chain + expanded AppSidebarProps interface

## Decisions Made
- Meetings hover card gates on `meetingsSummary.length > 0` — when no upcoming meetings, don't show hover (sidebar item has no tooltip at all, but empty state is shown inside if accessed)
- Blueprints and Case Studies show hover card whenever counts prop is present, using empty state message inside the component
- BlockerHoverContent conditionally renders severity rows — `{counts.critical > 0 && <DrillDownRow .../>}` to avoid showing zero-count rows
- Critical blocker badge uses `bg-red-500` class override to ensure distinct red color independent of theme variant

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 8 sidebar hover previews are implemented and TypeScript-clean
- Awaiting human visual verification (Task 3 checkpoint) to confirm hover + pin + drill-down + navigation work end-to-end
- Once approved, Phase 19 is complete

---
*Phase: 19-enhanced-sidebar-hover-previews*
*Completed: 2026-03-02*

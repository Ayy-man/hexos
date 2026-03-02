---
phase: 19-enhanced-sidebar-hover-previews
plan: 02
subsystem: ui
tags: [react, popover, radix-ui, sidebar, hover-preview, drill-down, lazy-fetch]

# Dependency graph
requires:
  - phase: 19-01
    provides: "/api/sidebar-previews route handler returning { items: Array<{id, name, href}> }"
provides:
  - "PinnableHoverCard component: hover-to-open, click-to-pin Popover replacing Tooltip in sidebar"
  - "DrillDownRow component: lazy-fetch stat rows with cached item name links"
  - "4 upgraded tooltip content components with interactive navigation links"
affects: [sidebar-ux, dashboard-layout, navigation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PinnableHoverCard: Popover with onMouseEnter/Leave open control + click-pin toggle"
    - "DrillDownRow: null/filled state caching pattern — fetch once, never re-fetch"
    - "Invisible overlay button for pin capture without blocking underlying Link navigation"

key-files:
  created: []
  modified:
    - components/app-sidebar.tsx

key-decisions:
  - "Used invisible zero-opacity button overlay with stopPropagation for pin capture — preserves underlying Link click for navigation"
  - "150ms leave delay on timeout ref prevents flicker when mouse moves between trigger and PopoverContent"
  - "DrillDownRow fetches /api/sidebar-previews only on first hover (items === null guard) and caches in component state"
  - "Working inquiry status passes status=working to route handler (approximation using proposal_stage='working')"

patterns-established:
  - "PinnableHoverCard pattern: wrap any sidebar nav item to get hover-preview + click-pin behavior"
  - "DrillDownRow pattern: lazy-load item names with state caching — reusable for any stat row"

requirements-completed: [SIDE-PINNABLE, SIDE-DRILL-EXISTING, SIDE-UX]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 19 Plan 02: Enhanced Sidebar Hover Previews Summary

**Replaced non-interactive Tooltip with PinnableHoverCard (Popover) + DrillDownRow for hover-open, click-pin, lazy-fetch drill-down navigation in all 4 sidebar items**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-02T20:01:50Z
- **Completed:** 2026-03-02T20:05:04Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `PinnableHoverCard` component replacing `Tooltip` — opens on hover, pins on click, 150ms leave delay prevents flicker, mouse-enter/leave wired on both trigger div and PopoverContent
- Created `DrillDownRow` component — stat rows that lazily fetch `/api/sidebar-previews` on first hover and cache result in component state (never re-fetches)
- Upgraded all 4 sidebar tooltip content components: Inquiries, Projects, Suggestions use `DrillDownRow`; Conversations wraps each unread conv in a `<Link>` to `/conversations/{id}`
- Replaced `Tooltip` render block in navigation loop with `PinnableHoverCard` wrapping `SidebarMenuButton` — navigation `<Link>` preserved and unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PinnableHoverCard and DrillDownRow, replace Tooltip with Popover** - `ed9974e` (feat)

## Files Created/Modified

- `components/app-sidebar.tsx` - Removed Tooltip imports, added Popover imports + useState; added PinnableHoverCard and DrillDownRow components; upgraded 4 content components; replaced Tooltip wrappers with PinnableHoverCard in render logic

## Decisions Made

- **Invisible overlay button for pin capture:** An absolutely-positioned zero-opacity button covers the trigger area and uses `e.stopPropagation()` to capture clicks for pinning without blocking the underlying `<Link>` inside `SidebarMenuButton` from handling navigation.
- **150ms leave timeout:** Using a `timeoutRef` with 150ms delay on `handleMouseLeave` prevents the popover from closing when the mouse moves from the trigger into the `PopoverContent`. The timeout is cleared on re-enter.
- **DrillDownRow caching via `items === null` guard:** Initial state is `null` (not empty array). First hover sets loading → fetches → sets items to the result array. Subsequent hovers skip fetch since `items !== null`.
- **Working inquiry approximation:** `status="working"` is passed to the route handler which queries `proposal_stage='working'`. This shows the most relevant working inquiries without exhaustive aggregation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled cleanly on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 19 is complete — both the API layer (19-01) and the UI layer (19-02) are done
- The sidebar now has fully interactive hover previews with pinnable popovers and clickable drill-down links
- No blockers for future phases

## Self-Check: PASSED

- FOUND: components/app-sidebar.tsx
- FOUND: .planning/phases/19-enhanced-sidebar-hover-previews/19-02-SUMMARY.md
- FOUND commit: ed9974e

---
*Phase: 19-enhanced-sidebar-hover-previews*
*Completed: 2026-03-02*

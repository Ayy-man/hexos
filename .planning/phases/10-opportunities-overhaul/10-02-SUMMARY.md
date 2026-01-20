---
phase: 10-opportunities-overhaul
plan: 02
subsystem: ui, server-actions
tags: [react, nextjs, server-actions, bidding, opportunities]

# Dependency graph
requires:
  - phase: 10-01
    provides: Bids API module with CRUD operations
provides:
  - Bid server actions for dev/admin operations
  - BidForm component for developer bid submission
  - BidCard component for bid display with status actions
  - BidList component for admin bid management
affects: [10-03, opportunities-page, dev-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic UI updates with revert on error"
    - "Collapsible content for long text"
    - "Sort options with useMemo for performance"

key-files:
  created:
    - "features/opportunities/actions/bidActions.ts"
    - "features/opportunities/components/BidForm.tsx"
    - "features/opportunities/components/BidCard.tsx"
    - "features/opportunities/components/BidList.tsx"
  modified: []

key-decisions:
  - "Use dropdown menu for admin bid actions (shortlist/accept/reject)"
  - "Highlight weeks difference from estimate with color coding"
  - "Sort nulls to end for price-based sorting"
  - "Optimistic updates with rollback for better UX"

patterns-established:
  - "Bid status workflow actions: shortlist -> accept or reject"
  - "Collapsible cover message for long bid pitches (>150 chars)"
  - "Sort options with useMemo for bid list performance"
  - "Currency input pattern reuse (type=text + inputMode=decimal)"

# Metrics
duration: 2min
completed: 2026-01-20
---

# Phase 10 Plan 02: Bidding UI & Actions Summary

**Bid server actions with revalidation, BidForm for developer submissions, BidCard/BidList for admin review with status management**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-01-20T02:50:47Z
- **Completed:** 2026-01-20T02:52:58Z
- **Tasks:** 3/3
- **Files created:** 4

## Accomplishments

- Created `bidActions.ts` with submitBidAction, withdrawBidAction, updateBidStatusAction
- All actions revalidate both dev and admin opportunity views
- BidForm supports weeks input (required), price input (optional), and cover message
- BidForm uses established currency input pattern (type=text + inputMode=decimal)
- BidCard displays developer info, weeks/price metrics, status badge, and action dropdown
- BidCard shows weeks difference from estimate with color coding (green=faster, amber=slower)
- BidCard supports collapsible cover message for long pitches
- BidList provides 6 sort options (newest, oldest, lowest/highest weeks, lowest/highest price)
- BidList uses optimistic updates with rollback on error for responsive UX
- Empty state when no bids exist

## Task Commits

Each task was committed atomically:

1. **Task 1: Create bid server actions** - `37d7376` (feat)
2. **Task 2: Create BidForm component** - `6579d73` (feat)
3. **Task 3: Create BidList and BidCard components** - `4fac77d` (feat)

## Files Created/Modified

- `features/opportunities/actions/bidActions.ts` - Server actions for bid CRUD
- `features/opportunities/components/BidForm.tsx` - Developer bid submission form
- `features/opportunities/components/BidCard.tsx` - Individual bid display card
- `features/opportunities/components/BidList.tsx` - Admin bid list with sorting

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Dropdown menu for admin actions | Compact UI, clear action hierarchy |
| Color-coded weeks difference | Quick visual feedback on timeline proposals |
| Null prices sort to end | Preserve meaningful price comparisons |
| Optimistic updates with rollback | Better UX, immediate feedback |
| 150 char threshold for collapsible | Balance readability with space efficiency |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - components are ready for integration into opportunity pages.

## Next Phase Readiness

- Server actions ready for page integration
- BidForm can be added to opportunity detail page for devs
- BidList can be added to admin opportunity management
- BidCard provides status workflow for bid review

---
*Phase: 10-opportunities-overhaul*
*Completed: 2026-01-20*

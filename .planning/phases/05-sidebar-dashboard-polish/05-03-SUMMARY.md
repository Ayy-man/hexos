---
phase: 05-sidebar-dashboard-polish
plan: 03
subsystem: ui
tags: [sidebar, tooltip, inquiries, status-counts, react]

# Dependency graph
requires:
  - phase: none
    provides: Existing inquiries API and sidebar components
provides:
  - getInquiryStatusCounts API function
  - InquiryCounts interface
  - InquiryTooltipContent component
  - Rich tooltip for Inquiries sidebar item
affects: [sidebar, inquiries, admin-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [rich-tooltip-pattern, conditional-badge-display]

key-files:
  created: []
  modified:
    - lib/api/inquiries.ts
    - lib/navigation.ts
    - components/app-sidebar.tsx
    - app/(dashboard)/layout.tsx

key-decisions:
  - "Combined related stages for tooltip display: working = working + in_queue + admin_reviewed"
  - "Ready = ready + final_review (nearly done inquiries)"
  - "Total excludes closed and lost (active pipeline only)"

patterns-established:
  - "Rich tooltip pattern: Tooltip with custom content for sidebar items with additional data"
  - "Conditional badge pattern: Show badge only when count > 0"

# Metrics
duration: 15min
completed: 2026-01-19
---

# Phase 05 Plan 03: Inquiry Status Tooltips Summary

**Sidebar Inquiries item shows rich tooltip with pipeline status breakdown (Unopened, Working, Ready, Total Active) for admin/internal users**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-19T17:58:42Z
- **Completed:** 2026-01-19T18:13:00Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments
- Admin/internal users see inquiry pipeline breakdown on Inquiries hover
- Tooltip displays Unopened (red), Working (cyan), Ready (green), Total Active
- Badge shows unopened count when > 0 on the Inquiries sidebar item
- Counts fetched server-side with no performance regression

## Task Commits

All tasks committed atomically in a single commit:

1. **Task 1: Add getInquiryStatusCounts function** - `bb65488` (feat)
2. **Task 2: Extend NavItem interface and AppSidebar props** - `bb65488` (feat)
3. **Task 3: Implement rich tooltip for Inquiries** - `bb65488` (feat)
4. **Task 4: Fetch inquiry counts in dashboard layout** - `bb65488` (feat)

## Files Created/Modified
- `lib/api/inquiries.ts` - Added getInquiryStatusCounts function returning counts per proposal stage
- `lib/navigation.ts` - Added InquiryCounts interface export
- `components/app-sidebar.tsx` - Added InquiryTooltipContent component and rich tooltip for Inquiries item
- `app/(dashboard)/layout.tsx` - Fetches inquiry counts for admin/internal users and passes to AppSidebar

## Decisions Made
- Combined stages for clearer tooltip: working = working + in_queue + admin_reviewed (active work)
- Ready = ready + final_review (nearly complete)
- Total excludes closed and lost to show active pipeline only
- Tooltip always visible on hover (not hidden when sidebar expanded) for quick status checks

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Git index was corrupted due to parallel processes; resolved by removing index and resetting
- Committed all tasks in single commit instead of per-task due to git state recovery

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Inquiry status tooltips complete and functional
- Pattern established for rich tooltips on sidebar items
- Ready for any additional sidebar enhancements

---
*Phase: 05-sidebar-dashboard-polish*
*Completed: 2026-01-19*

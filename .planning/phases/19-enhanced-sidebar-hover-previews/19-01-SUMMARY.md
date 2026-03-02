---
phase: 19-enhanced-sidebar-hover-previews
plan: 01
subsystem: api
tags: [supabase, next-api-routes, rls, server-client, drill-down]

# Dependency graph
requires: []
provides:
  - GET /api/sidebar-previews route handler for lazy sidebar hover card data
  - getInquiriesByStage function in lib/api/inquiries.ts
  - getProjectsByStatusGroup function in lib/api/projects.ts
  - getSuggestionsByStatus function in lib/api/suggestions.ts
  - getUpcomingMeetings function (server client) in lib/api/meetings.ts
  - getBlueprintStatusCounts + getBlueprintsByStatus in lib/api/blueprints.ts
  - getCaseStudyStatusCounts + getCaseStudiesByStatus in lib/api/case-studies.ts
  - getActiveBlockerCountsByPriority + getActiveBlockersByPriority in lib/api/blockers.ts
affects: [19-02-enhanced-sidebar-hover-previews]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sidebar drill-down API: single route handler at /api/sidebar-previews dispatches to entity-specific API functions"
    - "Server client alias pattern: import createClient as createServerClient when file already uses admin client"
    - "Uniform item shape: { id, name, href } returned for all entity types"

key-files:
  created:
    - app/api/sidebar-previews/route.ts
  modified:
    - lib/api/inquiries.ts
    - lib/api/projects.ts
    - lib/api/suggestions.ts
    - lib/api/meetings.ts
    - lib/api/blueprints.ts
    - lib/api/case-studies.ts
    - lib/api/blockers.ts

key-decisions:
  - "Used b.name (not b.title) for blueprints and case-studies since actual schema column is name, not title"
  - "getUpcomingMeetings uses createServerClient alias since meetings.ts already imports createClient from admin"
  - "All admin-gated types return empty items array (not 403) for non-admin users to avoid frontend error handling"
  - "limit capped at 10 in route handler to prevent unbounded queries"

patterns-established:
  - "Drill-down API functions append-only — existing functions never modified"
  - "Admin-only types gated via isAdminOrInternal check on profile.role in route handler"

requirements-completed: [SIDE-DRILL-API, SIDE-NEW-API]

# Metrics
duration: 15min
completed: 2026-03-03
---

# Phase 19 Plan 01: Enhanced Sidebar Hover Previews — API Layer Summary

**10 new API functions across 7 lib/api/ files + authenticated /api/sidebar-previews Route Handler returning uniform drill-down item lists for all 6 entity types**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-03T01:00:00Z
- **Completed:** 2026-03-03T01:25:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added 10 new exported functions across 7 existing lib/api/ files without modifying existing functions
- Created Route Handler at app/api/sidebar-previews/route.ts that authenticates, gates by role, and returns uniform `{ items: [{ id, name, href }] }` shape
- getUpcomingMeetings correctly uses server client (not admin) for RLS compliance while the rest of meetings.ts uses the admin client
- TypeScript compiles cleanly with zero errors throughout

## Task Commits

Each task was committed atomically:

1. **Task 1: Add drill-down API functions to 7 lib/api/ files** - `5482172` (feat)
2. **Task 2: Create Route Handler for lazy sidebar drill-down data** - `5375c0a` (feat)

## Files Created/Modified
- `app/api/sidebar-previews/route.ts` - New GET route handler for sidebar hover drill-down data; authenticates via getAuthProfile, gates admin-only types, returns { items } shape
- `lib/api/inquiries.ts` - Added getInquiriesByStage(stage, limit)
- `lib/api/projects.ts` - Added getProjectsByStatusGroup(group, limit) with status group mapping
- `lib/api/suggestions.ts` - Added getSuggestionsByStatus(status, limit)
- `lib/api/meetings.ts` - Added getUpcomingMeetings(limit) using server client alias; added createServerClient import
- `lib/api/blueprints.ts` - Added getBlueprintStatusCounts() and getBlueprintsByStatus(status, limit)
- `lib/api/case-studies.ts` - Added getCaseStudyStatusCounts() and getCaseStudiesByStatus(status, limit)
- `lib/api/blockers.ts` - Added getActiveBlockerCountsByPriority() and getActiveBlockersByPriority(priority, limit)

## Decisions Made
- Used `b.name` (not `b.title`) for blueprints and case-studies in the route handler since the actual DB schema column is `name`, not `title` — the plan had incorrect column names
- `getUpcomingMeetings` imports server client as `createServerClient` alias to avoid naming conflict with the existing admin `createClient` import in meetings.ts
- Non-admin/internal users receive `{ items: [] }` (not 403) to simplify frontend error handling on hover cards
- Route handler caps `limit` at 10 to prevent unbounded queries regardless of what the client requests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected column names for blueprints and case-studies in route handler**
- **Found during:** Task 2 (Route Handler creation)
- **Issue:** Plan specified `b.title` and `cs.title` for blueprints and case-studies, but the actual Supabase schemas use `name` as the column (visible in Blueprint and CaseStudy TypeScript interfaces)
- **Fix:** Used `b.name` and `cs.name` in the route handler item mapping; updated API functions to select `id, name` instead of `id, title`
- **Files modified:** app/api/sidebar-previews/route.ts, lib/api/blueprints.ts, lib/api/case-studies.ts
- **Verification:** TypeScript compiles without type errors
- **Committed in:** 5375c0a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - column name bug in plan spec)
**Impact on plan:** Fix essential for correctness — using wrong column name would produce null values in all blueprint/case-study item names.

## Issues Encountered
None beyond the column name deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All server-side API functions and Route Handler are complete and ready for use
- Phase 19-02 can now build sidebar hover card components that fetch from /api/sidebar-previews on first hover
- getUpcomingMeetings is available if meetings are needed in sidebar previews (not currently wired into the route handler but ready)

## Self-Check: PASSED

- app/api/sidebar-previews/route.ts: FOUND
- lib/api/inquiries.ts (getInquiriesByStage): FOUND
- lib/api/projects.ts (getProjectsByStatusGroup): FOUND
- lib/api/suggestions.ts (getSuggestionsByStatus): FOUND
- lib/api/meetings.ts (getUpcomingMeetings): FOUND
- lib/api/blueprints.ts (getBlueprintStatusCounts, getBlueprintsByStatus): FOUND
- lib/api/case-studies.ts (getCaseStudyStatusCounts, getCaseStudiesByStatus): FOUND
- lib/api/blockers.ts (getActiveBlockerCountsByPriority, getActiveBlockersByPriority): FOUND
- Commit 5482172 (Task 1): FOUND
- Commit 5375c0a (Task 2): FOUND
- TypeScript compilation: CLEAN (0 errors)

---
*Phase: 19-enhanced-sidebar-hover-previews*
*Completed: 2026-03-03*

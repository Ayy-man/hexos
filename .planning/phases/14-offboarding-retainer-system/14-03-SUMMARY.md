---
phase: 14-offboarding-retainer-system
plan: 03
subsystem: api
tags: [typescript, supabase, server-actions, retainer, check-ins, tasks, notifications]

# Dependency graph
requires:
  - phase: 14-01
    provides: Database foundation with retainer_check_ins and retainer_tasks tables
  - phase: initial-schema
    provides: Supabase client pattern and manual TypeScript types approach
  - phase: notifications-system
    provides: createNotification function for sending notifications
provides:
  - Retainer check-ins API with CRUD operations and due date calculation
  - Retainer tasks API with CRUD operations and status-based task counting
  - Server actions for check-ins with health warning notifications
  - Server actions for tasks with assignment notifications
  - Retainer config management with dev removal cascading
affects: [14-04-retainer-ui, retainer-dashboard, check-in-ui, retainer-tasks-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Due date calculation based on cadence and last check-in timestamp
    - Task ordering by status/priority/created_at for workflow display
    - Auto-managed completed_at timestamp on status changes
    - Health-based admin notifications for non-green check-ins
    - Assignment change detection for task notification triggers

key-files:
  created:
    - lib/api/retainer-check-ins.ts
    - lib/api/retainer-tasks.ts
    - features/projects/actions/retainerActions.ts
  modified: []

key-decisions:
  - "Calculate due date from last check-in + cadence, fallback to retainer_started_at"
  - "Notify all admins for any non-green health status (yellow or red)"
  - "Auto-manage completed_at when status changes to/from 'done'"
  - "Unassign tasks when devs removed from retainer_dev_ids"
  - "Order tasks by status first (todo/in_progress/done), then priority, then created_at"

patterns-established:
  - "Cadence-based due date calculation: Calculate next due date from last check-in timestamp + cadence days (weekly=7, biweekly=14, monthly=30)"
  - "Status-driven timestamp management: Auto-set completed_at when status becomes 'done', clear when status changes from 'done'"
  - "Health-triggered notifications: Send retainer_health_warning to all admins when health is not green"

# Metrics
duration: 2.5min
completed: 2026-02-09
---

# Phase 14 Plan 03: Retainer Check-ins & Tasks API Summary

**Complete API layer with check-ins (CRUD, due dates, health warnings), tasks (CRUD, assignment, auto-managed completion), and retainer config with cascading dev updates**

## Performance

- **Duration:** 2.5 min
- **Started:** 2026-02-09T13:33:02Z
- **Completed:** 2026-02-09T13:35:33Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Complete retainer check-ins API with CRUD, due date calculation based on cadence, and latest check-in fetching for dashboards
- Complete retainer tasks API with CRUD, status-based counting, auto-managed completed_at timestamps, and multi-level ordering
- Server actions with health warning notifications to admins for yellow/red check-ins
- Server actions with assignment notifications when tasks are created or reassigned
- Retainer config updates with automatic task unassignment when devs are removed from retainer team

## Task Commits

Each task was committed atomically:

1. **Task 1: Create retainer check-ins and tasks API modules** - `3da9b22` (feat)
2. **Task 2: Create retainer server actions** - `28adbd0` (feat)

## Files Created/Modified
- `lib/api/retainer-check-ins.ts` - CRUD for check-ins with getRetainerCheckIns (all for project), logCheckIn (create), getLatestCheckIn (most recent), getNextCheckInDueDate (calculate based on cadence)
- `lib/api/retainer-tasks.ts` - CRUD for tasks with getRetainerTasks (all for project ordered by status/priority/created), getRetainerTaskCounts (status breakdown), createRetainerTask, updateRetainerTask (auto-manages completed_at), deleteRetainerTask
- `features/projects/actions/retainerActions.ts` - 5 server actions: logCheckInAction (with health warnings), createRetainerTaskAction (with assignment notifications), updateRetainerTaskAction (with assignment change detection), deleteRetainerTaskAction, updateRetainerConfigAction (with dev removal cascading)

## Decisions Made
- **Due date calculation fallback chain:** Last check-in created_at + cadence → retainer_started_at + cadence → today + cadence (ensures due date always calculable)
- **Notify all admins for non-green health:** Simplified health warning logic - any yellow or red health triggers notifications to all admin users (no per-admin config needed for V1)
- **Auto-manage completed_at in updateRetainerTask:** When status changes to 'done', set completed_at to now; when status changes from 'done' to anything else, clear completed_at (prevents manual timestamp management in UI)
- **Task ordering priority:** Status first (todo → in_progress → done), then priority (high → low), then created_at (newest first) - ensures active todos surface first
- **Unassign removed dev tasks:** When dev removed from retainer_dev_ids, automatically unassign all their tasks on that project (prevents orphaned assignments)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**API layer complete and ready for UI implementation:**
- Check-ins API supports logging, listing, and due date display
- Tasks API supports full CRUD with assignment tracking
- Notifications automatically sent for health warnings and task assignments
- Config management handles dev team changes gracefully

**Plan 14-04 can now build retainer UI on this foundation:**
- Check-in submission forms with health indicators
- Task management boards with status transitions
- Due date warnings and overdue indicators
- Assignment flows with notification triggers

**No blockers.** Phase 14 Wave 2 API layer is complete.

---
*Phase: 14-offboarding-retainer-system*
*Completed: 2026-02-09*

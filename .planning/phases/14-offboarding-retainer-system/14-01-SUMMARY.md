---
phase: 14-offboarding-retainer-system
plan: 01
subsystem: database, api
tags: [supabase, postgresql, typescript, retainer, offboarding, rls]

# Dependency graph
requires:
  - phase: initial-schema
    provides: Database foundation with get_user_role() function and RLS pattern
  - phase: project-status-lifecycle
    provides: ProjectStatus type system and STATUS_PHASES mapping
provides:
  - Retainer system database tables (retainer_check_ins, retainer_tasks, project_improvements)
  - Extended project_status enum with 'retainer' value
  - Retainer config columns on projects table
  - TypeScript types for retainer phase and notifications
  - Status transitions for offboarding workflow
affects: [14-02, 14-03, 14-04, 14-05, completion-ceremony, check-in-ui, retainer-tasks-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Retainer phase between delivery and closed phases
    - Role-based RLS for retainer tables (admin/DFY/dev access patterns)
    - Retainer config as nullable columns on projects table (not separate config table)

key-files:
  created:
    - supabase/migrations/20260210000001_retainer_system.sql
  modified:
    - lib/api/projects.ts
    - lib/utils/projectPhases.ts
    - lib/api/notifications-utils.ts
    - features/projects/components/ProjectStatusControl.tsx
    - features/projects/components/files-tab/CollapsedHeader.tsx

key-decisions:
  - "Use TEXT CHECK constraint for check_in_cadence instead of new enum type"
  - "Store check_in_assignees as TEXT[] of role strings (admin/dfy/dev) not user IDs"
  - "Allow retainer_tasks on both 'retainer' and 'completed' status projects"
  - "Place retainer phase between delivery and closed in phase order"
  - "Use JSONB for completion_summary to support flexible ceremony data structure"

patterns-established:
  - "Retainer config as inline columns: Nullable retainer-specific fields on projects table rather than separate retainer_config table"
  - "Post-delivery lifecycle: accepted->retainer->completed or accepted->completed (direct close)"
  - "Retainer reactivation: completed->retainer allows converting closed projects to ongoing retainer"

# Metrics
duration: 3min
completed: 2026-02-09
---

# Phase 14 Plan 01: Offboarding & Retainer System Summary

**Database foundation with retainer_check_ins, retainer_tasks, and project_improvements tables; extended project_status enum; TypeScript types for retainer phase and 6 notification types**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-09T13:24:59Z
- **Completed:** 2026-02-09T13:27:50Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created complete Supabase migration with 3 new tables, RLS policies, and indexes
- Extended project_status enum with 'retainer' value between accepted and completed
- Added retainer config columns to projects table (cadence, assignees, dev_ids, summary, timestamps)
- Extended TypeScript ProjectStatus type and STATUS_PHASES in both shared utility and component
- Added 6 new notification types for retainer lifecycle events with handlers
- Updated status transitions to support retainer workflow (accepted->retainer, retainer->completed, completed->retainer)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase migration for retainer system** - `3461e62` (feat)
2. **Task 2: Extend TypeScript types, phases, notifications, and transitions** - `3d8d648` (feat)

## Files Created/Modified
- `supabase/migrations/20260210000001_retainer_system.sql` - Database schema: enum extension, 3 tables with RLS, retainer config columns
- `lib/api/projects.ts` - Extended ProjectStatus type with 'retainer', added retainer config fields to Project/UpdateProjectInput interfaces
- `lib/utils/projectPhases.ts` - Added retainer to STATUS_PHASES, PHASE_ORDER, getPhaseName; added isRetainerPhase/isCompletedPhase/isPostDeliveryPhase helpers
- `lib/api/notifications-utils.ts` - Added 6 retainer notification types with icon/color/URL handlers
- `features/projects/components/ProjectStatusControl.tsx` - Updated STATUS_PHASES, PHASE_ORDER, labels, colors, and transitions for retainer lifecycle
- `features/projects/components/files-tab/CollapsedHeader.tsx` - Added retainer status label and color (discovered via TypeScript compilation)

## Decisions Made
- **TEXT CHECK constraint for cadence:** Used TEXT with CHECK instead of creating new enum type for check_in_cadence - simpler for 3 fixed values
- **Role-based assignees:** check_in_assignees stores role strings ('admin', 'dfy', 'dev') not user IDs - roles auto-expand to current team members
- **Retainer tasks on completed projects:** Allow task creation on both 'retainer' and 'completed' status - supports post-completion work tracking
- **Phase ordering:** Placed retainer between delivery and closed phases - represents ongoing maintenance state before final closure
- **JSONB completion summary:** Flexible structure for completion ceremony snapshot without rigid schema

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript compilation error in CollapsedHeader.tsx:**
- After extending ProjectStatus type, discovered CollapsedHeader.tsx also had Record<ProjectStatus, string> mappings
- Fixed by adding retainer label and color to both statusLabels and statusColors
- TypeScript compilation caught this automatically - no runtime issue

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Database foundation complete and ready for UI implementation:**
- All retainer tables exist with proper RLS policies
- TypeScript types extended across codebase
- Notification system ready for retainer events
- Status transitions configured for offboarding workflow

**Plans 02-05 can now build UI on this foundation:**
- Plan 02: Completion Ceremony dialog
- Plan 03: Check-in scheduling and submission UI
- Plan 04: Retainer tasks management
- Plan 05: Project improvements backlog

**No blockers.** Phase 14 Wave 1 foundation is complete.

---
*Phase: 14-offboarding-retainer-system*
*Completed: 2026-02-09*

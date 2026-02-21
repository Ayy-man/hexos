---
phase: 16-notification-coverage-overhaul
plan: 05
subsystem: api
tags: [notifications, cron, supabase, typescript, retainer, proposals, deliverables]

# Dependency graph
requires:
  - phase: 16-notification-coverage-overhaul
    provides: notifyAdmins/notifyUsers helpers and retainer_check_in_overdue/deadline_reminder/proposal_ready types in TS union
  - phase: 14-offboarding-retainer-system
    provides: retainer_check_ins table, retainer_dev_ids column, check_in_cadence column, retainer_started_at column
provides:
  - Cron endpoint for retainer check-in overdue detection with cadence-based due date calculation
  - Cron endpoint for deliverable deadline reminders (3-day look-ahead window)
  - Cron endpoint for stale proposal detection (14-day threshold, weekly notifications)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CRON_SECRET Bearer token validation for all cron endpoints
    - Admin client raw insert for cron routes (no cookie-based session available)
    - Per-entity deduplication via notifications table query before inserting
    - Cadence-based due date calculation for retainer check-ins

key-files:
  created:
    - app/api/cron/check-in-overdue/route.ts
    - app/api/cron/deadline-reminders/route.ts
    - app/api/cron/proposal-expiry/route.ts
  modified: []

key-decisions:
  - "Cron routes use admin client raw inserts — createNotification() and notifyAdmins() use cookie-based server auth unavailable in cron GET handlers"
  - "Deduplication uses notifications table query before inserting — prevents daily spam without requiring a separate deduplication tracking table"
  - "proposal-expiry deduplicates by company name LIKE match — notifications table has no inquiry_id FK so message content is the best proxy"
  - "proposal_ready type reused for stale proposal alerts — avoids new enum value, DFY vs admin recipients get different title/message text"
  - "check-in-overdue uses retainer_dev_ids array (not project_assignments) — retainer projects track dev assignments differently from active projects"

patterns-established:
  - "Cron admin client pattern: createClient() from lib/supabase/admin + direct .from().insert() for notifications (no push support, acceptable for scheduled jobs)"
  - "Pre-insert deduplication: query notifications table with type + project_id/message match + gte(created_at, cutoff) before inserting to prevent spam"

requirements-completed:
  - NOTIF-08

# Metrics
duration: 10min
completed: 2026-02-22
---

# Phase 16 Plan 05: Cron Endpoints for Scheduled Notifications Summary

**Three secured cron GET endpoints activating orphaned notification types: check-in overdue detection with cadence math, 3-day deadline look-ahead for deliverables, and 14-day stale proposal detection with weekly deduplication**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-22T21:30:09Z
- **Completed:** 2026-02-22T21:40:00Z
- **Tasks:** 2
- **Files modified:** 3 (all created)

## Accomplishments
- Created `app/api/cron/check-in-overdue/route.ts`: queries retainer projects, calculates next due date from last check-in + cadence days (weekly=7, biweekly=14, monthly=30), notifies retainer_dev_ids and admins using `retainer_check_in_overdue` type, 24h deduplication
- Created `app/api/cron/deadline-reminders/route.ts`: finds deliverables with due dates within 3 days, notifies assigned devs (via project_assignments) and admins using `deadline_reminder` type, 24h deduplication per deliverable
- Created `app/api/cron/proposal-expiry/route.ts`: detects proposals pending 14+ days (proposal_stage='sent'), notifies DFY partner and admins using `proposal_ready` type with 7-day deduplication (weekly cadence)
- All three endpoints secured with `Bearer ${CRON_SECRET}` authorization header validation
- All three use admin client for direct DB access since cron GET handlers have no user session/cookies

## Task Commits

Each task was committed atomically:

1. **Task 1: Create check-in overdue and deadline reminder cron endpoints** - `8c904af` (feat)
2. **Task 2: Create proposal expiry cron endpoint** - `06bc11c` (feat)

**Plan metadata:** `[pending]` (docs: complete plan)

## Files Created/Modified
- `app/api/cron/check-in-overdue/route.ts` - Retainer check-in overdue detection; queries retainer projects with cadence, calculates next due date, notifies devs+admins with 24h dedup
- `app/api/cron/deadline-reminders/route.ts` - Deliverable deadline reminder; finds deliverables due within 3 days, notifies assigned devs+admins with 24h dedup
- `app/api/cron/proposal-expiry/route.ts` - Stale proposal detection; finds proposals pending 14+ days, notifies DFY partner+admins with 7-day dedup

## Decisions Made
- Cron routes use admin client raw inserts: `createNotification()` and `notifyAdmins()` both call `createClient()` from `lib/supabase/server` which needs cookie-based auth unavailable in cron GET handlers. Used `createClient()` from `lib/supabase/admin` + direct `.from('notifications').insert()` instead. Push notifications not sent (acceptable for scheduled jobs).
- Deduplication uses notifications table pre-query: before inserting notifications for an entity, query the notifications table for matching type + entity within the dedup window. Prevents daily spam without a separate tracking table.
- `proposal-expiry` deduplicates by company name LIKE match: since the notifications table has no `inquiry_id` FK column, used `.like('message', '%companyName%')` as a proxy for per-inquiry dedup.
- `proposal_ready` notification type reused for stale proposals: avoids adding a new enum value (`stale_proposal` would require a DB migration). DFY and admin recipients receive different `title` and `message` text to distinguish context.
- `check-in-overdue` uses `retainer_dev_ids` array from projects table: retainer projects track their assigned devs differently from active projects (which use `project_assignments` join table). The retainer migration added `retainer_dev_ids UUID[]` directly on the projects row.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. TypeScript compiled cleanly on first attempt.

## User Setup Required
None - no external service configuration required. To activate cron endpoints, configure your cron scheduler (Vercel Cron, GitHub Actions, etc.) to call:
- `GET /api/cron/check-in-overdue` with `Authorization: Bearer <CRON_SECRET>` (daily)
- `GET /api/cron/deadline-reminders` with `Authorization: Bearer <CRON_SECRET>` (daily)
- `GET /api/cron/proposal-expiry` with `Authorization: Bearer <CRON_SECRET>` (weekly or daily)

The `CRON_SECRET` environment variable must be set in your deployment environment.

## Next Phase Readiness
- Phase 16 notification coverage overhaul is now complete: all 5 plans executed
- Orphaned notification types `retainer_check_in_overdue`, `deadline_reminder`, and `proposal_ready` (for stale proposals) are now triggered by scheduled cron jobs
- No further notification coverage work required for v1.0

---
*Phase: 16-notification-coverage-overhaul*
*Completed: 2026-02-22*

## Self-Check: PASSED

All created files exist and task commits verified:
- FOUND: app/api/cron/check-in-overdue/route.ts
- FOUND: app/api/cron/deadline-reminders/route.ts
- FOUND: app/api/cron/proposal-expiry/route.ts
- FOUND: .planning/phases/16-notification-coverage-overhaul/16-05-SUMMARY.md
- COMMIT: 8c904af (Task 1 - check-in overdue and deadline reminders)
- COMMIT: 06bc11c (Task 2 - proposal expiry)

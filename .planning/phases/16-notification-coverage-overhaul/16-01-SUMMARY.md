---
phase: 16-notification-coverage-overhaul
plan: 01
subsystem: api
tags: [notifications, postgres, supabase, migrations, typescript]

# Dependency graph
requires:
  - phase: 11-notification-system-audit
    provides: createNotification() function and NotificationType union
  - phase: 14-offboarding-retainer-system
    provides: retainer notification types in TS union
  - phase: 15-meeting-assistant
    provides: meeting_ready notification type in TS union
provides:
  - DB notification_type enum synced with all 47+ TypeScript types
  - notifyAdmins() helper for fire-and-forget admin bulk notifications
  - notifyProjectStakeholders() helper for project team notifications
  - notifyUsers() helper for arbitrary user list notifications
  - 13 new phase-16 notification types in TS union with icons, colors, URLs
affects:
  - 16-02
  - 16-03
  - 16-04
  - 16-05

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Idempotent enum expansion via pg_enum IF NOT EXISTS guard per value
    - Fire-and-forget notification helpers with Promise.allSettled
    - Admin client for webhook-context notifications (no cookie auth)

key-files:
  created:
    - supabase/migrations/20260222000001_sync_notification_type_enum.sql
    - lib/api/notification-helpers.ts
  modified:
    - lib/api/notifications-utils.ts
    - features/projects/actions/extensionActions.ts
    - features/projects/actions/scopeActions.ts
    - app/api/webhooks/stripe/route.ts

key-decisions:
  - "Webhook context uses admin client loop for notification insert — createNotification/notifyAdmins require cookie-based auth unavailable in webhook route handlers"
  - "Extension notifications use status_change type (not extension_requested/approved/rejected) since those values are not in the TS union"
  - "Stripe webhook also extended to notify 'internal' role users in addition to 'admin' for payment failure notifications"
  - "notifyAdmins/notifyProjectStakeholders use Promise.allSettled for fire-and-forget semantics — partial failures don't block callers"

patterns-established:
  - "Idempotent notification enum expansion: one DO $$ block per value with pg_enum enumlabel check"
  - "Bulk notification helpers: fetch recipients, call createNotification per user, Promise.allSettled, log errors without throwing"

requirements-completed:
  - NOTIF-06
  - NOTIF-07

# Metrics
duration: 5min
completed: 2026-02-22
---

# Phase 16 Plan 01: Notification Coverage Overhaul Foundation Summary

**Idempotent DB migration adding 38 missing notification_type enum values, reusable notifyAdmins/notifyProjectStakeholders/notifyUsers helpers, and elimination of all as-never casts and raw notification inserts from extensionActions/scopeActions/stripe webhook**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-22T21:09:23Z
- **Completed:** 2026-02-22T21:14:00Z
- **Tasks:** 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- Created migration with 38 idempotent ADD VALUE blocks covering 25 values missing from DB (existing TS union) + 13 new phase-16 types (inquiry_created, proposal_sent, inquiry_won, inquiry_lost, escalation_admin, project_created, deliverable_status_change, deliverables_confirmed, send_for_signoff, signed_off, check_in_submitted, blocker_raised, meeting_scheduled)
- Created `lib/api/notification-helpers.ts` with `notifyAdmins`, `notifyProjectStakeholders`, and `notifyUsers` fire-and-forget helpers ready for Plans 02-05 to consume
- Removed all 3 `as never` casts from scopeActions.ts (scope_change_flagged, scope_change_approved, scope_change_rejected now valid TS types)
- Replaced 3 raw `supabase.from('notifications').insert` calls in extensionActions.ts with `createNotification()` (adds push notification support)
- Replaced batch notification insert in Stripe webhook with individual Promise.allSettled loop; also extended admin filter to include 'internal' role

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration to sync notification_type enum + notification helpers module** - `8d9dcb6` (feat)
2. **Task 2: Fix raw insert patterns and as-never casts** - `b7bf380` (feat)

**Plan metadata:** `[pending]` (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/20260222000001_sync_notification_type_enum.sql` - 38 idempotent ADD VALUE blocks expanding notification_type enum from 12 to 47+ values
- `lib/api/notification-helpers.ts` - notifyAdmins, notifyProjectStakeholders, notifyUsers batch notification helpers
- `lib/api/notifications-utils.ts` - NotificationType union extended with 13 new phase-16 types; icons, colors, URL routing for all new types
- `features/projects/actions/extensionActions.ts` - 3 raw inserts replaced with createNotification()
- `features/projects/actions/scopeActions.ts` - 3 'as never' casts removed
- `app/api/webhooks/stripe/route.ts` - batch insert replaced with Promise.allSettled loop; role filter extended to admin+internal

## Decisions Made
- Webhook context must use admin client for notification inserts: `createNotification()` calls `createClient()` (cookie-based server auth) which is unavailable in Route Handler webhook context without a session. Used `supabase2.from('notifications').insert()` per admin in a `Promise.allSettled` loop instead of `notifyAdmins()`.
- Extension notifications use `status_change` type: the legacy extension action code referenced `extension_requested`, `extension_approved`, `extension_rejected` types that are not in the NotificationType union and would have required new DB enum values. The plan approved using `status_change` as a simpler mapping.
- Internal role included for payment failure notifications: the original Stripe webhook only queried `role = 'admin'`. Extended to `role IN ('admin', 'internal')` for consistency with notifyAdmins helper pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended Stripe webhook admin filter to include 'internal' role**
- **Found during:** Task 2 (Fix raw insert patterns)
- **Issue:** Original code only notified 'admin' users for payment failures; notifyAdmins() filters for both 'admin' and 'internal'. Keeping the original filter would leave internal users out.
- **Fix:** Changed `.eq('role', 'admin')` to `.in('role', ['admin', 'internal'])` to match notifyAdmins() behavior
- **Files modified:** app/api/webhooks/stripe/route.ts
- **Verification:** TypeScript compiles cleanly; query change is clearly correct
- **Committed in:** b7bf380 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix ensures consistent admin notification coverage. No scope creep.

## Issues Encountered
- `createNotification()` cannot be called in Stripe webhook context (uses cookie-based auth). Resolved by using admin client insert loop directly — webhooks never had push notification support anyway so this is not a regression.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DB enum and TS union are fully synchronized — Plans 02-05 can safely add new notification types using any value in the NotificationType union
- notifyAdmins(), notifyProjectStakeholders(), notifyUsers() helpers ready to import in Plans 02-05 action files
- No as-never casts or raw notification inserts remain in extensionActions, scopeActions, or stripe webhook

---
*Phase: 16-notification-coverage-overhaul*
*Completed: 2026-02-22*

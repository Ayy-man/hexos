---
phase: 16-notification-coverage-overhaul
plan: 02
subsystem: api
tags: [notifications, postgres, supabase, migrations, typescript, triggers]

# Dependency graph
requires:
  - phase: 16-notification-coverage-overhaul
    plan: 01
    provides: notifyAdmins() helper, notification_type enum with inquiry_created/proposal_sent/inquiry_won/inquiry_lost/escalation_admin/mention

provides:
  - Inquiry lifecycle admin notifications (inquiry_created, proposal_sent, inquiry_won, inquiry_lost)
  - Fixed escalation notifications — escalateToAdmin() now creates actual admin notification (escalation_admin)
  - DB trigger notify_mention() on message_mentions for @mention notifications
affects:
  - 16-03
  - 16-04
  - 16-05

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fire-and-forget notifications in API functions: try/catch wrapping notifyAdmins() so notification failures never block primary operations
    - DB trigger for cross-code-path notifications: prefer trigger over application code when multiple paths create the same event
    - Self-mention guard in SQL trigger: IF sender_id = mentioned_user_id THEN RETURN NEW (skip notification)

key-files:
  created:
    - supabase/migrations/20260222000002_mention_notification_trigger.sql
  modified:
    - lib/api/inquiries.ts
    - lib/api/proposal-reminders.ts

key-decisions:
  - "prospect_company_name added to SELECT in markInquiryAsClosed and markProposalLost — original queries only fetched stage_history/proposal_stage which was insufficient for notification messages"
  - "escalateToAdmin() fetches inquiry details and current user before updating DB — this is new behavior; function previously had no auth context"
  - "DB trigger uses raw INSERT into notifications (not createNotification()) — triggers run in DB context without cookie-based auth; push notifications not fired for mentions in V1"
  - "inquiry.form_data?.project_type used for createInquiry notification — form_data is JSONB, project_type may live inside it; falls back to 'General' if absent"

patterns-established:
  - "Notification-safe SELECT expansion: when adding notifications to existing functions, expand the SELECT to include fields needed for notification messages"
  - "DB trigger for multi-path events: use Postgres AFTER INSERT trigger with SECURITY DEFINER when same event can originate from multiple code paths"

requirements-completed:
  - NOTIF-01
  - NOTIF-05

# Metrics
duration: 8min
completed: 2026-02-22
---

# Phase 16 Plan 02: Notification Coverage Overhaul - Inquiry/Proposal Notifications Summary

**notifyAdmins() wired into 5 inquiry/proposal lifecycle events and Postgres trigger for DB-level @mention notifications, fixing the deceptive escalateToAdmin toast**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-21T21:17:22Z
- **Completed:** 2026-02-21T21:25:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Added `notifyAdmins()` to `createInquiry()` — admins now notified on every new inquiry submission with company name and project type
- Added `notifyAdmins()` to `submitProposalToDfy()` — admins notified when proposal sent to DFY (in addition to existing DFY partner notification)
- Added `notifyAdmins()` to `markInquiryAsClosed()` — admins notified when DFY partner closes deal as won
- Added `notifyAdmins()` to `markProposalLost()` — admins notified with company name and loss reason
- Fixed deceptive UX in `escalateToAdmin()` — was updating DB flag with no notification; now creates real `escalation_admin` notification so the existing "Admin has been notified" toast is truthful
- Created `20260222000002_mention_notification_trigger.sql` with `notify_mention()` PL/pgSQL function and `mention_notify` trigger on `message_mentions` AFTER INSERT

## Task Commits

Each task was committed atomically:

1. **Task 1: Add inquiry/proposal lifecycle notifications** - `065af01` (feat)
2. **Task 2: Create @mention notification DB trigger** - `e0310f0` (feat)

**Plan metadata:** `[pending]` (docs: complete plan)

## Files Created/Modified
- `lib/api/inquiries.ts` - Imported notifyAdmins; added admin notifications in createInquiry, submitProposalToDfy, markInquiryAsClosed
- `lib/api/proposal-reminders.ts` - Imported notifyAdmins; added admin notifications in markProposalLost and escalateToAdmin; expanded SELECT in markProposalLost and added user auth context to escalateToAdmin
- `supabase/migrations/20260222000002_mention_notification_trigger.sql` - notify_mention() function and mention_notify trigger; self-mention guard; message preview truncated to 200 chars; SECURITY DEFINER

## Decisions Made
- `prospect_company_name` added to SELECT clauses in `markInquiryAsClosed` and `markProposalLost`: the original queries only fetched `stage_history` and `proposal_stage` but notification messages need the company name.
- `escalateToAdmin()` needed `auth.getUser()` and an inquiry SELECT that weren't there originally — added both so the function has actor context and company name for the notification.
- DB trigger uses raw INSERT into notifications rather than `createNotification()` — triggers execute in DB context with no HTTP session/cookies; push notifications for mentions deferred to V1.1 via Edge Function if needed.
- `inquiry.form_data?.project_type` used in `createInquiry` notification message — `CreateInquiryData` has `form_data` as the container for form fields; falls back to 'General' if absent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Expanded SELECT queries to include prospect_company_name**
- **Found during:** Task 1 (inquiry/proposal lifecycle notifications)
- **Issue:** `markInquiryAsClosed` selected only `proposal_stage, stage_history`; `markProposalLost` selected only `stage_history, proposal_stage`. Notification messages required `prospect_company_name`.
- **Fix:** Added `prospect_company_name` to both SELECT clauses
- **Files modified:** lib/api/inquiries.ts, lib/api/proposal-reminders.ts
- **Verification:** TypeScript compiles cleanly; field is nullable TEXT so no type errors
- **Committed in:** 065af01 (Task 1 commit)

**2. [Rule 1 - Bug] Added auth context to escalateToAdmin()**
- **Found during:** Task 1 (escalateToAdmin deceptive UX fix)
- **Issue:** `escalateToAdmin()` had no `supabase.auth.getUser()` call and no inquiry SELECT — both required for the `notifyAdmins()` actorId and message content
- **Fix:** Added `auth.getUser()` and a `prospect_company_name` SELECT before the DB update
- **Files modified:** lib/api/proposal-reminders.ts
- **Verification:** TypeScript compiles cleanly; getUser() is called after createClient() already established
- **Committed in:** 065af01 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs — insufficient SELECT fields, missing auth context)
**Impact on plan:** Both fixes required for the plan's changes to work correctly. No scope creep.

## Issues Encountered
- None

## User Setup Required
None - no external service configuration required. Migration will be applied on next `supabase db push`.

## Next Phase Readiness
- Plans 03-05 can now assume inquiry/proposal lifecycle notifications are covered
- @mention notifications are fully automated at DB level — no application code changes needed for future mention paths
- All 5 P0 inquiry/proposal notification gaps are closed

## Self-Check: PASSED

- lib/api/inquiries.ts: FOUND
- lib/api/proposal-reminders.ts: FOUND
- supabase/migrations/20260222000002_mention_notification_trigger.sql: FOUND
- .planning/phases/16-notification-coverage-overhaul/16-02-SUMMARY.md: FOUND
- Commit 065af01: FOUND
- Commit e0310f0: FOUND

---
*Phase: 16-notification-coverage-overhaul*
*Completed: 2026-02-22*

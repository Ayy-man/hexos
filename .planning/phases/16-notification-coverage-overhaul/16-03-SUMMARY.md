---
phase: 16-notification-coverage-overhaul
plan: 03
subsystem: api
tags: [notifications, typescript, supabase, invoices, projects, deliverables]

# Dependency graph
requires:
  - phase: 16-notification-coverage-overhaul
    plan: 01
    provides: notifyProjectStakeholders, notifyAdmins, notifyUsers helpers; DB enum synced
provides:
  - Project creation notifications to all stakeholders via completeInitiationAction
  - Deliverables confirmed notification via confirmDeliverablesAction
  - Send-for-signoff notification via sendForSignoffAction
  - Client signoff notification via signOffDeliverablesAction
  - Deliverable status change notification via updateDeliverableStatusAction
  - Invoice sent notification to client and admins via sendInvoice
  - Payment received notification to client and admins via markInvoicePaid
  - Invoice voided notification to DFY partner and client via voidInvoice
affects:
  - 16-04
  - 16-05

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Project lifecycle notifications via notifyProjectStakeholders on status transitions
    - Payment event notifications: client lookup via project.client_id from joined invoice query

key-files:
  created: []
  modified:
    - features/project-initiation/actions/initiationActions.ts
    - features/projects/actions/projectActions.ts
    - features/projects/actions/deliverableActions.ts
    - lib/api/invoices.ts
    - lib/types/invoices.ts

key-decisions:
  - "Client invoice notifications use project.client_id not invoice.client_email — invoices have no direct profile UUID, but the joined project exposes client_id via FK"
  - "Extended getInvoice() query to join projects.client_id alongside existing dfy_partner_id join"
  - "Added client_id to InvoiceWithProject type as optional nullable field"
  - "voidInvoice notifies DFY partner and client (not admins) — void is an operational event affecting parties directly, admins see this via audit log"

patterns-established:
  - "Invoice notification pattern: fetch client_id from joined project, createNotification per party, notifyAdmins for bulk admin delivery"

requirements-completed:
  - NOTIF-02
  - NOTIF-03

# Metrics
duration: 15min
completed: 2026-02-22
---

# Phase 16 Plan 03: Project/Deliverable Lifecycle and Payment Notifications Summary

**notifyProjectStakeholders wired into 5 action entry points (project creation through client signoff) and notifyAdmins + client notifications added to invoice send/paid/void flows**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-21T21:17:47Z
- **Completed:** 2026-02-21T21:32:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `notifyProjectStakeholders` to `completeInitiationAction` (project created), `confirmDeliverablesAction`, `sendForSignoffAction`, `signOffDeliverablesAction`, and `updateDeliverableStatusAction`
- Expanded `getInvoice()` query to also join `projects.client_id` so invoice notification functions have a profile UUID for the client
- Added `client_id?: string | null` to `InvoiceWithProject` type
- `sendInvoice`: notifies client (if `client_id` present) and all admins in addition to existing DFY partner notification
- `markInvoicePaid`: notifies client and all admins in addition to existing DFY partner notification
- `voidInvoice`: notifies DFY partner and client

## Task Commits

Each task was committed atomically:

1. **Task 1: Add project/deliverable lifecycle notifications** - `6f02af4` (feat)
2. **Task 2: Add payment notification coverage for clients and admins** - `570110d` (feat)

**Plan metadata:** `[pending]` (docs: complete plan)

## Files Created/Modified
- `features/project-initiation/actions/initiationActions.ts` - Import + call notifyProjectStakeholders after project creation
- `features/projects/actions/projectActions.ts` - Import notifyProjectStakeholders; add calls to confirmDeliverables, sendForSignoff, signOffDeliverables
- `features/projects/actions/deliverableActions.ts` - Import + call notifyProjectStakeholders in updateDeliverableStatusAction
- `lib/api/invoices.ts` - Import notifyAdmins; expand getInvoice join; add client+admin notifications in sendInvoice, markInvoicePaid, voidInvoice
- `lib/types/invoices.ts` - Add client_id field to InvoiceWithProject

## Decisions Made
- Client invoice notifications use `project.client_id` not `invoice.client_email`: invoices don't have a direct profile UUID for the client (only email/name for Stripe), but the linked project has `client_id` FK to profiles. Extended `getInvoice()` join to include this.
- `voidInvoice` notifies DFY partner and client (not admins via `notifyAdmins`) since voiding is an operational action on those parties' finances; admins can see this via the activity/audit log.
- All notification additions use try/catch to ensure no primary operation fails due to notification failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added client_id to InvoiceWithProject type and getInvoice query**
- **Found during:** Task 2 (Add payment notification coverage)
- **Issue:** The plan referenced `invoice.client_id` but the Invoice/InvoiceWithProject types had no such field. The invoice stores only `client_email` and `client_name` (for Stripe), with no profile UUID. The project joined to the invoice does have `client_id`.
- **Fix:** Extended `getInvoice()` select to join `projects.client_id`, mapped it onto the return object, and added `client_id?: string | null` to `InvoiceWithProject`
- **Files modified:** `lib/api/invoices.ts`, `lib/types/invoices.ts`
- **Verification:** TypeScript compiles cleanly; client_id is properly typed and available in sendInvoice/markInvoicePaid/voidInvoice
- **Committed in:** `570110d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — type/query gap)
**Impact on plan:** Required for client notifications to work. No scope creep.

## Issues Encountered
- Invoice type had no `client_id` — the plan assumes this field exists but it didn't. Resolved by querying it from the joined project and extending the type.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full project lifecycle (creation → deliverables → signoff) now produces notifications
- Invoice/payment events notify client and admins
- Plans 04-05 can build on the same notification-helpers pattern
- notifyAdmins, notifyProjectStakeholders, notifyUsers all available for Plans 04-05

---
*Phase: 16-notification-coverage-overhaul*
*Completed: 2026-02-22*

## Self-Check: PASSED

- FOUND: features/project-initiation/actions/initiationActions.ts
- FOUND: features/projects/actions/projectActions.ts
- FOUND: features/projects/actions/deliverableActions.ts
- FOUND: lib/api/invoices.ts
- FOUND: lib/types/invoices.ts
- FOUND: .planning/phases/16-notification-coverage-overhaul/16-03-SUMMARY.md
- FOUND commit: 6f02af4 (Task 1)
- FOUND commit: 570110d (Task 2)

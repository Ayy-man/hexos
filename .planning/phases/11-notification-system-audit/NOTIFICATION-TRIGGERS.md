# Notification Trigger Documentation

**Generated:** 2026-01-19
**Total triggers:** 27
**Total types:** 30

## Overview

The hexOS notification system uses Supabase for storage and real-time delivery. When an event occurs, `createNotification()` inserts a record into the `notifications` table. Supabase Realtime (postgres_changes) broadcasts INSERT events to subscribed clients, which display them as toast pop-ups via the `use-notifications-realtime.ts` hook. Push notifications are also sent via web-push for when the app is closed.

### Architecture Flow

```
[Trigger] -> createNotification() -> INSERT into notifications table
                                          |
                         Supabase Realtime (postgres_changes)
                                          |
                         use-notifications-realtime.ts hook
                                          |
                         toastQueue state -> NotificationToast components
                                          |
                         (also) Push notification via web-push
```

## Notification Types (30 total)

| Type | Icon | Color | URL Pattern |
|------|------|-------|-------------|
| project_assigned | folder | text-info | /projects/{id} |
| assigned | folder | text-info | /inquiries |
| status_change | refresh-cw | text-muted-foreground | /projects/{id} |
| stage_changed | refresh-cw | text-muted-foreground | /inquiries |
| blocker_acknowledged | alert-circle | text-warning | /projects/{id}?tab=requirements |
| blocker_resolved | alert-circle | text-success | /projects/{id}?tab=requirements |
| blocker_comment | message-circle | text-info | /projects/{id}?tab=requirements |
| admin_comment | message-circle | text-info | /projects/{id}?tab=activity |
| mention | at-sign | text-primary | /projects/{id}?tab=activity |
| deadline_reminder | clock | text-error | /projects/{id}?tab=deliverables |
| invoice_sent | file-text | text-info | /projects/{id}?tab=financials |
| invoice_paid | check-circle | text-success | /projects/{id}?tab=financials |
| payout_submitted | upload | text-info | /finances/payouts |
| payout_approved | check-circle | text-success | /finances/payouts |
| payout_paid | dollar-sign | text-success | /finances/payouts |
| payout_rejected | x-circle | text-error | /finances/payouts |
| scope_change_flagged | flag | text-warning | /projects/{id}?tab=scope |
| scope_change_approved | check-circle | text-success | /projects/{id}?tab=scope |
| scope_change_rejected | x-circle | text-error | /projects/{id}?tab=scope |
| proposal_ready | file-check | text-success | /inquiries |
| requirement_unblocked | unlock | text-info | /projects/{id}?tab=requirements |
| testing_ready_dev | play-circle | text-primary | /projects/{id}?tab=testing |
| testing_ready_admin_int | play-circle | text-primary | /projects/{id}?tab=testing |
| testing_ready_client | play-circle | text-primary | /projects/{id}?tab=testing |
| testing_passed | check-circle-2 | text-success | /projects/{id}?tab=testing |
| testing_failed | x-circle | text-error | /projects/{id}?tab=testing |
| testing_escalated | zap | text-warning | /projects/{id}?tab=testing |
| suggestion_reply | message-circle | text-info | /my-suggestions |
| suggestion_status_change | lightbulb | text-warning | /my-suggestions |
| (default) | bell | text-muted-foreground | /dashboard |

## Trigger Sources

### lib/api/notifications.ts

| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `createNotification()` | [varies] | Single user | Called by all other triggers; also sends push notification |

### lib/api/inquiries.ts

| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `updateInquiryStage()` | `stage_changed` | Assigned user | Stage changes, assignee != actor |
| `updateInquiryStage()` | `stage_changed` | DFY partner | Stage is sent/closed/lost |
| `assignInquiry()` | `assigned` | Assigned user | New assignment |
| `submitProposalToDfy()` | `proposal_ready` | DFY partner | Proposal submitted |

### lib/api/payouts.ts

| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `submitPayout()` | `payout_submitted` | Admins | New payout request |
| `approvePayout()` | `payout_approved` | Developer | Payout approved |
| `markPayoutPaid()` | `payout_paid` | Developer | Payout completed |
| `rejectPayout()` | `payout_rejected` | Developer | Payout rejected |

### lib/api/invoices.ts

| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `createInvoice()` | `invoice_sent` | Client | Invoice created |
| `markInvoicePaid()` | `invoice_paid` | Project stakeholders | Invoice paid |

### lib/api/scope-monitoring.ts

| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `approveScopeChange()` | `scope_change_approved` | Requester | Change approved |
| `rejectScopeChange()` | `scope_change_rejected` | Requester | Change rejected |

### lib/api/requirement-notifications.ts

| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `checkAndNotifyUnblockedRequirements()` | `requirement_unblocked` | Assignee/Client/DFY | Dependency completed |

### lib/api/testing-notifications.ts

| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `notifyDevTestingReady()` | `testing_ready_dev` | Assigned dev | Ready for self-test |
| `notifyAdminIntTestingReady()` | `testing_ready_admin_int` | Admin/Internal | Ready for QA |
| `notifyClientTestingReady()` | `testing_ready_client` | Client/DFY | Ready for UAT |
| `notifyTestingPassed()` | `testing_passed` | Admin/Internal | Testing passed |
| `notifyTestingFailed()` | `testing_failed` | Admin/Internal | Testing failed |
| `notifyTestingEscalated()` | `testing_escalated` | Admin/Internal/Client | UAT escalated |

### features/dev/actions/blockerActions.ts

| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `updateBlockerStatusAction()` | `blocker_acknowledged` | Reporter | Status = acknowledged |
| `updateBlockerStatusAction()` | `blocker_resolved` | Reporter | Status = resolved |

### features/projects/actions/projectActions.ts

| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `updateDevAssignmentAction()` | `project_assigned` | Assigned dev | New assignment |
| `updateProjectStatusAction()` | `status_change` | Project members | Status changes |

### features/projects/actions/scopeActions.ts

| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `flagScopeChangeAction()` | `scope_change_flagged` | Admins | Scope change flagged |
| `approveScopeChangeAction()` | `scope_change_approved` | Requester | Change approved |
| `rejectScopeChangeAction()` | `scope_change_rejected` | Requester | Change rejected |

## File Structure

```
lib/
├── api/
│   ├── notifications.ts           # CRUD operations, createNotification()
│   ├── notifications-utils.ts     # Types, helpers, URL routing
│   ├── testing-notifications.ts   # Testing-specific notification helpers
│   └── requirement-notifications.ts # Requirement unblocking notifications
├── push/
│   ├── notifications.ts           # Client-side push subscription
│   └── send-notification.ts       # Server-side push delivery
hooks/
└── use-notifications-realtime.ts  # Realtime subscription + toast queue
components/notifications/
├── NotificationPopover.tsx        # Bell icon popover
├── NotificationToast.tsx          # Individual toast component
├── NotificationList.tsx           # Grouped notification list
└── NotificationItem.tsx           # Single notification in list
features/notifications/
└── actions/notificationActions.ts # Server actions for marking read
```

## Known Issues (Fixed)

### Duplicate Toast Pop-ups (FIXED in Phase 11)

- **Problem:** All unread notifications shown as toasts on every page load
- **Root cause:** No tracking of which notifications were already shown as toast
- **Fix:** Added `shown_as_toast_at` column + time window filter (< 5 min) + immediate marking on display

### Database Changes (Phase 11)

```sql
-- Migration: 20260119000001_notification_toast_tracking.sql
ALTER TABLE notifications
ADD COLUMN shown_as_toast_at TIMESTAMPTZ;

-- Partial index for efficient filtering
CREATE INDEX idx_notifications_unshown_toast
ON notifications(user_id, created_at DESC)
WHERE read_at IS NULL AND shown_as_toast_at IS NULL;
```

## Maintenance Notes

When adding new notification triggers:

1. **Add type** to `NotificationType` in `lib/api/notifications-utils.ts`
2. **Add icon mapping** in `getNotificationIcon()`
3. **Add color mapping** in `getNotificationColor()`
4. **Add URL routing** in `getNotificationUrl()`
5. **Call createNotification()** from appropriate action with:
   - `userId`: Recipient
   - `type`: NotificationType
   - `title`: Short description
   - `message`: Optional details
   - `projectId`: Optional project context
   - `actorId`: Who triggered the notification
6. **Update this document** with the new trigger

### Testing Notifications

To verify a notification works:
1. Trigger the action in the app
2. Check notifications table in Supabase
3. Verify toast appears in realtime
4. Check push notification received (if app backgrounded)
5. Verify URL navigation works when clicking notification

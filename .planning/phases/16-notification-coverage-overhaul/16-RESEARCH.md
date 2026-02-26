# Phase 16 Research: Notification Coverage Overhaul

**Researched:** 2026-02-22
**Method:** 5 parallel audit agents covering infrastructure, inquiry/proposal, project/payment, dev experience, and database layers

---

## 1. Current Infrastructure

### Notification Table Schema
- **Table:** `public.notifications` (in `20260107000001_dev_experience_foundation.sql`)
- **Columns:** id, user_id, type (enum), title, message, project_id, deliverable_id, blocker_id, actor_id, read_at, created_at, shown_as_toast_at
- **Indexes:** user, user_unread (partial), project, created_desc, unshown_toast (partial)
- **RLS:** Users see/update/delete own only; system can insert for any user

### Delivery Mechanisms
1. **In-app DB insert** — primary mechanism
2. **Push notification** — via web-push + VAPID keys, triggered by `createNotification()`
3. **Realtime subscription** — Supabase Realtime on notifications table
4. **Toast popup** — max 5 stacked, auto-dismiss, draggable, with sound

### Core Function: `createNotification()`
**File:** `lib/api/notifications.ts`
```
Params: { userId, type, title, message?, projectId?, deliverableId?, blockerId?, actorId? }
Returns: Notification object
Side effect: Fires push notification (async, non-blocking)
```

### CRITICAL ISSUE: Inconsistent Creation Patterns
Some code uses `createNotification()` (includes push), others use raw `supabase.from('notifications').insert()` (skips push). Example: `extensionActions.ts:45-52` uses raw insert.

### Existing DB Triggers (5 total)
1. `project_dev_assign_sync` — project assignment → `project_assigned` to dev
2. `blocker_status_notify` — blocker status change → `blocker_acknowledged/resolved` to reporter
3. `blocker_comment_notify` — new blocker comment → `blocker_comment` to reporter
4. `invitation_notify` — project invitation → `project_assigned` to dev
5. `bid_notify` — bid submitted → `opportunity_bid` to admins/internal

### 47 Notification Types Defined
Of these, **6+ are orphaned** (defined but never triggered):
- `retainer_check_in_due`
- `retainer_check_in_overdue`
- `project_completed`
- `project_moved_to_retainer`
- `deadline_reminder`
- `admin_comment`

### Notification Preferences
**Stored in:** `profiles.notification_preferences` (JSONB)
**Channels:** in_app, email
**Categories:** project_updates, deliverable_completed, mentions, direct_messages, inquiry_updates, payment_updates, weekly_digest

---

## 2. Inquiry/Proposal Lifecycle Gaps

### ROOT CAUSE OF REPORTED BUG
`ProposalStatusDialog` calls `markInquiryAsClosed()` and `markProposalLost()` directly, which **bypass** `updateInquiryStage()` — the only function with notification logic.

### Gap Details

| Transition | File | Function | Lines | Notified | Should Notify |
|-----------|------|----------|-------|----------|---------------|
| Inquiry created | `lib/api/inquiries.ts` | `createInquiry()` | 20-45 | Nobody | Admin |
| Inquiry assigned | `lib/api/inquiries.ts` | `assignInquiry()` | 336-368 | Assigned user | OK |
| Proposal sent | `lib/api/inquiries.ts` | `submitProposalToDfy()` | 496-546 | DFY only | +Admin |
| DFY marks WON | `lib/api/inquiries.ts` | `markInquiryAsClosed()` | 647-689 | Nobody | Admin |
| DFY marks LOST | `lib/api/proposal-reminders.ts` | `markProposalLost()` | 275-313 | Nobody | Admin |
| Snooze escalation | `lib/api/proposal-reminders.ts` | `escalateToAdmin()` | 318-330 | Nobody (fake toast!) | Admin |
| Request admin help | `lib/api/proposal-reminders.ts` | `escalateToAdmin()` | 318-330 | Nobody (fake toast!) | Admin |
| Proposal stale | `lib/api/proposal-reminders.ts` | detection only | 43-101 | Nobody (no cron) | Admin, DFY |

### DECEPTIVE UX
`ProposalStatusDialog` line 96: Toast says "Admin has been notified and will follow up" — but `escalateToAdmin()` only sets a timestamp flag. **No notification is created.**

---

## 3. Project/Payment Lifecycle Gaps

| Transition | File | Function | Lines | Notified | Should Notify |
|-----------|------|----------|-------|----------|---------------|
| Project created | `features/project-initiation/actions/initiationActions.ts` | `completeInitiationAction()` | 46-256 | Nobody | Admin, DFY, Dev |
| Project status change | `features/projects/actions/projectActions.ts` | `updateProjectStatusAction()` | 23-81 | Dev only | +Admin, Client, DFY |
| Project completion | N/A | Type defined, never created | — | Nobody | All stakeholders |
| Project → retainer | N/A | Type defined, never created | — | Nobody | All stakeholders |
| Deliverable status change | `features/projects/actions/deliverableActions.ts` | `updateDeliverableStatusAction()` | 134-170 | Nobody | PM, DFY, Dev |
| Deliverables confirmed | `features/projects/actions/projectActions.ts` | `confirmDeliverablesAction()` | 79 | Nobody | Dev, DFY |
| Send for signoff | `features/projects/actions/projectActions.ts` | `sendForSignoffAction()` | 98 | Nobody | Client, DFY |
| Signed off | `features/projects/actions/projectActions.ts` | `signOffDeliverablesAction()` | 115 | Nobody | Admin, Dev, DFY |
| Invoice sent | `lib/api/invoices.ts` | `sendInvoice()` | 341-351 | DFY only | +Client, Admin |
| Payment received | `lib/api/invoices.ts` | `markInvoicePaid()` | 511-521 | DFY only | +Client, Admin |
| Payment failed | `app/api/webhooks/stripe/route.ts` | POST handler | 59-88 | Admins only | +Client, DFY |
| Invoice voided | `lib/api/invoices.ts` | `voidInvoice()` | — | Nobody | DFY, Client |
| Dev check-in submitted | `features/projects/actions/checkinActions.ts` | `submitCheckinAction()` | 19-51 | Nobody | Admin, DFY |

### Type Safety Issue
`scopeActions.ts` lines 57, 107, 146 cast notification types as `never`:
```typescript
type: 'scope_change_flagged' as never,
```
Suggests these types aren't in the `NotificationType` union or there's an enum mismatch.

### Extension Notifications Skip Push
`extensionActions.ts:45-52` uses raw `supabase.from('notifications').insert()` instead of `createNotification()`, meaning push notifications are never sent for extension events.

---

## 4. Dev Experience Lifecycle Gaps

| Transition | File | Function | Lines | Notified | Should Notify |
|-----------|------|----------|-------|----------|---------------|
| Dev check-in submitted | `features/projects/actions/checkinActions.ts` | `submitCheckinAction()` | 19-51 | Nobody | Admin, DFY |
| Check-in overdue | N/A | No cron job (types defined but unused) | — | Nobody | Dev, Admin |
| Blocker raised | `features/dev/actions/blockerActions.ts` | `reportBlockerAction()` | 20-37 | Nobody | Admin, DFY |
| Blocker ack/resolved | DB trigger | `notify_blocker_status_change()` | — | Reporter | OK |
| Blocker escalated | `features/dev/actions/blockerActions.ts` | `escalateBlockerAction()` | 153-188 | DFY | OK |
| Meeting scheduled | `features/meetings/actions/meetingActions.ts` | `createMeetingAction()` | 16-33 | Nobody | Participants |
| Meeting notes ready | `lib/api/meeting-processing.ts` | webhook handler | 147-152 | Creator | OK |
| @Mention in conversation | `message_mentions` table | No trigger exists | — | Nobody | Mentioned user |
| Suggestion status change | `lib/actions/suggestions.ts` | `updateSuggestionAction()` | 62-106 | Author | OK |
| Requirement unblocked | `lib/api/requirement-notifications.ts` | `checkAndNotifyUnblockedRequirements()` | 8-50 | Assigned user | OK |
| Testing auto-escalation | `app/api/testing/check-escalations/route.ts` | GET handler | 1-51 | Nobody (flags only) | Admin |
| Hill position updated | `features/projects/actions/checkinActions.ts` | `quickPositionUpdateAction()` | 171-231 | Nobody | Admin, DFY |

---

## 5. Database Layer Findings

### Missing Triggers Needed
1. `message_mentions` INSERT → create `mention` notification for mentioned user
2. No triggers for project/deliverable status changes
3. No triggers for payment events
4. No triggers for deadline reminders

### No Scheduled Jobs Found
- No cron for deadline reminders (`deadline_reminder` type unused)
- No cron for check-in overdue detection (`retainer_check_in_due/overdue` types unused)
- No cron for proposal expiry notifications
- No cron for digest emails (`weekly_digest` preference exists but no sender)
- Testing escalation cron exists but only flags — doesn't notify

### Enum Additions Needed
Current notification_type enum may need additions or the `as never` casts need resolution. Verify which types in `notifications-utils.ts` are actually in the DB enum.

---

## 6. Implementation Strategy

### Approach: Application-Level Notifications (not DB triggers)
Most gaps should be fixed at the application level (in server actions/API functions) rather than DB triggers because:
- More flexibility for role-based recipient selection
- Can use `createNotification()` which includes push
- Easier to test and maintain
- DB triggers can't easily query role-based recipients

### One exception: @mentions
The `message_mentions` INSERT → notification trigger is better as a DB trigger since mentions are created from multiple code paths.

### Centralization Needed
1. Create helper: `notifyAdmins(type, title, message, refs)` — queries all admin/internal users
2. Create helper: `notifyProjectStakeholders(projectId, type, title, message)` — notifies admin + dfy + dev
3. Fix all raw `supabase.from('notifications').insert()` calls to use `createNotification()`

### Enum Sync
Run migration to add any missing types to the DB enum and remove `as never` casts.

---

## 7. Priority Grouping

### P0 — Critical (deals/money, deceptive UX)
- DFY marks won/lost/stale → admin notification
- Escalation/help request → admin notification (fix lying toast)
- Inquiry created → admin notification

### P1 — High (workflow visibility)
- Project created → stakeholder notifications
- Deliverable lifecycle → stakeholder notifications
- Payment events → client notifications
- Check-in submitted → admin/DFY notification
- Blocker raised → admin/DFY notification

### P2 — Medium (completeness)
- @Mention trigger
- Project status changes → full recipient list
- Extension notifications → use createNotification()
- Scope notification type safety fix
- Orphaned types → implement or remove

### P3 — Low (scheduled/automated)
- Check-in overdue cron
- Deadline reminder cron
- Proposal expiry cron
- Testing auto-escalation notification

## RESEARCH COMPLETE

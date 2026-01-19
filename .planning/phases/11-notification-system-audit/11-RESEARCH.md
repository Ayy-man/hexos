# Phase 11: Notification System Audit - Research

**Researched:** 2026-01-19
**Domain:** Notification system reliability, duplicate prevention, trigger documentation
**Confidence:** HIGH

## Summary

The hexOS notification system is already well-architected with Supabase Realtime for in-app notifications, push notifications via web-push, and a toast queue system for UI pop-ups. However, research identified a **critical bug causing duplicate pop-ups** in the `use-notifications-realtime.ts` hook that shows existing unread notifications as toasts on every page load/navigation.

The system has 27 distinct notification triggers spread across 9 files, uses 28 notification types, and lacks comprehensive documentation mapping these triggers. The reliability issues stem from:
1. Toast queue showing already-seen notifications on initial load
2. No deduplication mechanism for the toast queue
3. Missing "shown_at" or "popped_at" tracking field in the notifications table

**Primary recommendation:** Add a `shown_as_toast_at` column to track which notifications have already been displayed as pop-ups, fix the initial load logic to exclude previously-shown notifications, and document all trigger points.

## Standard Stack

The notification system is already implemented. This audit focuses on fixes and documentation, not new libraries.

### Core (Already in Place)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| @supabase/supabase-js | 2.x | Realtime subscriptions for INSERT events | Working |
| web-push | - | Server-side push notification delivery | Working |
| framer-motion | - | Toast animation (slide in, swipe to dismiss) | Working |
| sonner | - | Secondary toast system (for form errors, etc.) | Working |

### No Additional Libraries Needed

The existing stack is sufficient. Fixes are architectural/logical, not library-based.

## Architecture Patterns

### Current Notification Flow
```
[Trigger] → createNotification() → INSERT into notifications table
                                         ↓
                         Supabase Realtime (postgres_changes)
                                         ↓
                         use-notifications-realtime.ts hook
                                         ↓
                         toastQueue state → NotificationToast components
```

### Current Files Structure
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

### Recommended Fix Pattern: Toast Deduplication

```typescript
// Add to notifications table schema
shown_as_toast_at TIMESTAMPTZ  -- NULL = never shown as toast

// Modified initial load logic in use-notifications-realtime.ts
useEffect(() => {
  if (!hasShownInitial && initialNotifications.length > 0) {
    // ONLY show notifications that:
    // 1. Are unread (read_at IS NULL)
    // 2. Have NEVER been shown as toast (shown_as_toast_at IS NULL)
    // 3. Were created within last 5 minutes (to catch very recent ones)
    const recentCutoff = Date.now() - 5 * 60 * 1000
    const toShow = initialNotifications.filter(n =>
      !n.read_at &&
      !n.shown_as_toast_at &&
      new Date(n.created_at).getTime() > recentCutoff
    )
    if (toShow.length > 0) {
      setToastQueue(toShow)
      playSound()
      // Mark as shown
      markAsToastShown(toShow.map(n => n.id))
    }
    setHasShownInitial(true)
  }
}, [initialNotifications, hasShownInitial, playSound])
```

### Anti-Patterns to Avoid

- **Showing all unread as toasts:** The current bug - unread !== "needs to be shown as pop-up"
- **Client-only deduplication:** Using localStorage/sessionStorage for "shown" state loses sync across tabs
- **No time window for initial toasts:** Showing hours-old notifications as urgent pop-ups

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast deduplication | In-memory Set in hook | Database column `shown_as_toast_at` | Persists across page loads, syncs across tabs |
| Notification sounds | Custom audio handling | Existing `audioRef` pattern | Already works, handles autoplay restrictions |
| Realtime connection | Custom WebSocket | Supabase Realtime | Built-in reconnection, RLS-aware |

**Key insight:** The database is the source of truth for notification state. All deduplication logic should be database-backed, not client-state-only.

## Common Pitfalls

### Pitfall 1: Initial Load Toast Spam (CURRENT BUG)

**What goes wrong:** Every page navigation/refresh shows all unread notifications as toast pop-ups, even ones the user has already seen and dismissed.

**Why it happens:**
- `hasShownInitial` resets on every mount of `NotificationPopover`
- `initialNotifications` includes ALL unread, not just "never shown as toast"
- Line 203-212 in `use-notifications-realtime.ts` shows up to 5 unread on every initial load

**How to avoid:**
1. Add `shown_as_toast_at` column to notifications table
2. Filter initial load to only show notifications where `shown_as_toast_at IS NULL`
3. Add time window (e.g., only last 5 minutes) for initial toast display

**Warning signs:**
- Users complaining about "same notifications popping up repeatedly"
- Toast queue showing old notifications on navigation
- Sound playing on every page load

### Pitfall 2: Missing Notification Triggers

**What goes wrong:** Some events that should trigger notifications don't, because `createNotification()` calls are missing from action files.

**Why it happens:** Features are added incrementally, notifications are an afterthought.

**How to avoid:**
1. Document ALL notification trigger points (see Trigger Documentation section)
2. Add notifications as part of feature acceptance criteria
3. Audit actions for missing notification calls

**Warning signs:**
- Users not getting expected notifications
- Inconsistency in when notifications appear

### Pitfall 3: Push + Realtime Double-Notification

**What goes wrong:** User sees both a system push notification AND an in-app toast for the same event.

**Why it happens:** `createNotification()` fires push immediately (line 176-184 in `lib/api/notifications.ts`), then Realtime delivers to open browser, which adds to toast queue.

**How to avoid:**
- This is intentional design (push for when app is closed, toast for when open)
- Ensure push uses `tag` parameter to collapse duplicate pushes
- Consider adding preference for "push only when app is closed"

**Warning signs:**
- User sees same notification twice in quick succession
- Confusion about which to click

### Pitfall 4: Notification Fatigue from Bulk Operations

**What goes wrong:** Bulk operations (e.g., mark all requirements complete) generate one notification per item, overwhelming the recipient.

**Why it happens:** Loop calls `createNotification()` per item without batching.

**How to avoid:**
1. Batch notifications for bulk operations
2. Use summary notifications: "5 requirements were marked complete"
3. Add debouncing for rapid-fire notifications

**Warning signs:**
- Users disabling notifications entirely
- Toast queue maxed out at 5 constantly

## Notification Trigger Documentation

### All Triggers by Source File

#### `lib/api/notifications.ts`
| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `createNotification()` | [varies] | Single user | Called by all other triggers |

#### `lib/api/inquiries.ts`
| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `updateInquiryStage()` | `stage_changed` | Assigned user | Stage changes, assignee != actor |
| `updateInquiryStage()` | `stage_changed` | DFY partner | Stage is sent/closed/lost |
| `assignInquiry()` | `assigned` | Assigned user | New assignment |
| `submitProposalToDfy()` | `proposal_ready` | DFY partner | Proposal submitted |

#### `lib/api/payouts.ts`
| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `submitPayout()` | `payout_submitted` | Admins | New payout request |
| `approvePayout()` | `payout_approved` | Developer | Payout approved |
| `markPayoutPaid()` | `payout_paid` | Developer | Payout completed |
| `rejectPayout()` | `payout_rejected` | Developer | Payout rejected |

#### `lib/api/invoices.ts`
| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `createInvoice()` | `invoice_sent` | Client | Invoice created |
| `markInvoicePaid()` | `invoice_paid` | Project stakeholders | Invoice paid |

#### `lib/api/scope-monitoring.ts`
| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `approveScopeChange()` | `scope_change_approved` | Requester | Change approved |
| `rejectScopeChange()` | `scope_change_rejected` | Requester | Change rejected |

#### `lib/api/requirement-notifications.ts`
| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `checkAndNotifyUnblockedRequirements()` | `requirement_unblocked` | Assignee/Client/DFY | Dependency completed |

#### `lib/api/testing-notifications.ts`
| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `notifyDevTestingReady()` | `testing_ready_dev` | Assigned dev | Ready for self-test |
| `notifyAdminIntTestingReady()` | `testing_ready_admin_int` | Admin/Internal | Ready for QA |
| `notifyClientTestingReady()` | `testing_ready_client` | Client/DFY | Ready for UAT |
| `notifyTestingPassed()` | `testing_passed` | Admin/Internal | Testing passed |
| `notifyTestingFailed()` | `testing_failed` | Admin/Internal | Testing failed |
| `notifyTestingEscalated()` | `testing_escalated` | Admin/Internal/Client | UAT escalated |

#### `features/dev/actions/blockerActions.ts`
| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `updateBlockerStatusAction()` | `blocker_acknowledged` | Reporter | Status = acknowledged |
| `updateBlockerStatusAction()` | `blocker_resolved` | Reporter | Status = resolved |

#### `features/projects/actions/projectActions.ts`
| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `updateDevAssignmentAction()` | `project_assigned` | Assigned dev | New assignment |
| `updateProjectStatusAction()` | `status_change` | Project members | Status changes |

#### `features/projects/actions/scopeActions.ts`
| Function | Type | Recipients | Condition |
|----------|------|------------|-----------|
| `flagScopeChangeAction()` | `scope_change_flagged` | Admins | Scope change flagged |
| `approveScopeChangeAction()` | `scope_change_approved` | Requester | Change approved |
| `rejectScopeChangeAction()` | `scope_change_rejected` | Requester | Change rejected |

### Notification Types (28 total)

```typescript
type NotificationType =
  // Project & Assignment
  | 'project_assigned'
  | 'assigned'
  | 'status_change'
  | 'stage_changed'

  // Blockers
  | 'blocker_acknowledged'
  | 'blocker_resolved'
  | 'blocker_comment'

  // Communication
  | 'admin_comment'
  | 'mention'
  | 'deadline_reminder'

  // Finance
  | 'invoice_sent'
  | 'invoice_paid'
  | 'payout_submitted'
  | 'payout_approved'
  | 'payout_paid'
  | 'payout_rejected'

  // Scope
  | 'scope_change_flagged'
  | 'scope_change_approved'
  | 'scope_change_rejected'

  // Proposals
  | 'proposal_ready'

  // Requirements
  | 'requirement_unblocked'

  // Testing (6 types)
  | 'testing_ready_dev'
  | 'testing_ready_admin_int'
  | 'testing_ready_client'
  | 'testing_passed'
  | 'testing_failed'
  | 'testing_escalated'
```

## Code Examples

### Fix: Add shown_as_toast_at column

```sql
-- Migration: Add toast tracking column
ALTER TABLE notifications
ADD COLUMN shown_as_toast_at TIMESTAMPTZ;

-- Index for efficient filtering
CREATE INDEX idx_notifications_not_toasted
ON notifications(user_id, shown_as_toast_at)
WHERE shown_as_toast_at IS NULL;
```

### Fix: Modified getMyNotifications for toast filtering

```typescript
// lib/api/notifications.ts - Add new function
export async function getUnshownToastNotifications(
  limit: number = 5,
  minutesWindow: number = 5
): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const cutoff = new Date(Date.now() - minutesWindow * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!actor_id(id, name),
      project:projects(id, project_name)
    `)
    .eq('user_id', user.id)
    .is('read_at', null)
    .is('shown_as_toast_at', null)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(normalizeNotificationRelations)
}
```

### Fix: Mark notifications as toast-shown

```typescript
// lib/api/notifications.ts - Add new function
export async function markAsToastShown(notificationIds: string[]): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ shown_as_toast_at: new Date().toISOString() })
    .in('id', notificationIds)

  if (error) throw error
}
```

### Fix: Modified useNotificationsRealtime hook

```typescript
// hooks/use-notifications-realtime.ts - Replace initial toast effect

// Show initial unread notifications as toasts on first load
// ONLY if they haven't been shown before and are recent
useEffect(() => {
  if (!hasShownInitial && initialNotifications.length > 0) {
    // Filter to only unshown, recent notifications
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const unshown = initialNotifications.filter(n =>
      !n.read_at &&
      !n.shown_as_toast_at &&
      new Date(n.created_at).getTime() > fiveMinutesAgo
    ).slice(0, 5)

    if (unshown.length > 0) {
      setToastQueue(unshown)
      playSound()
      // Mark these as shown (fire and forget)
      markAsToastShown(unshown.map(n => n.id)).catch(console.error)
    }
    setHasShownInitial(true)
  }
}, [initialNotifications, hasShownInitial, playSound])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Show all unread as toasts | Only show un-toasted recent | This phase | Prevents duplicate pop-ups |
| No toast tracking | `shown_as_toast_at` column | This phase | Database-backed deduplication |
| Undocumented triggers | Trigger documentation | This phase | Maintainability |

**Deprecated/outdated:**
- None identified - notification system was recently built

## Open Questions

1. **Should dismissed toasts be marked as read?**
   - What we know: Currently, dismissing a toast does NOT mark it as read
   - What's unclear: Is this the desired behavior?
   - Recommendation: Add option to mark as read on dismiss, default to current behavior

2. **Push notification deduplication**
   - What we know: `tag` parameter exists but may not be used consistently
   - What's unclear: Are users seeing push + toast duplicates?
   - Recommendation: Audit push notification tags, ensure each type has unique tag

3. **Toast queue persistence across tabs**
   - What we know: Each tab has independent toast queue
   - What's unclear: Should toasts sync across tabs?
   - Recommendation: Accept current behavior, `shown_as_toast_at` prevents re-showing

## Sources

### Primary (HIGH confidence)
- Codebase analysis of:
  - `/Users/aymanbaig/Desktop/hexos-main/hooks/use-notifications-realtime.ts`
  - `/Users/aymanbaig/Desktop/hexos-main/lib/api/notifications.ts`
  - `/Users/aymanbaig/Desktop/hexos-main/lib/api/notifications-utils.ts`
  - `/Users/aymanbaig/Desktop/hexos-main/components/notifications/NotificationPopover.tsx`
  - `/Users/aymanbaig/Desktop/hexos-main/components/notifications/NotificationToast.tsx`

### Secondary (HIGH confidence)
- Existing documentation at `/Users/aymanbaig/Desktop/hexos-main/agent_docs/realtime.md`
- Existing pitfalls research at `/Users/aymanbaig/Desktop/hexos-main/.planning/research/PITFALLS.md`

### Trigger Files Analyzed (HIGH confidence)
- `lib/api/inquiries.ts`
- `lib/api/payouts.ts`
- `lib/api/invoices.ts`
- `lib/api/scope-monitoring.ts`
- `lib/api/requirement-notifications.ts`
- `lib/api/testing-notifications.ts`
- `features/dev/actions/blockerActions.ts`
- `features/projects/actions/projectActions.ts`
- `features/projects/actions/scopeActions.ts`

## Metadata

**Confidence breakdown:**
- Duplicate toast bug: HIGH - Direct code analysis confirms the issue
- Trigger documentation: HIGH - Exhaustive grep of `createNotification(` calls
- Fix approach: HIGH - Standard database-backed state pattern

**Research date:** 2026-01-19
**Valid until:** 60 days (stable system, low change rate expected)

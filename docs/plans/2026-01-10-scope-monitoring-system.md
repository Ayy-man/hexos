# Scope Monitoring System - Implementation Plan

**Status:** Implemented
**Created:** 2026-01-10
**Implemented:** 2026-01-09

## Overview

A system to track scope changes after client sign-off, allowing anyone to flag changes while requiring admin approval.

**Key Decisions:**
- Baseline captured at `signed_off` status
- Anyone (Dev, DFY, Admin) can flag scope changes
- Changes auto-detected on deliverable edits (description, hours, timeline, new tasks)
- Non-blocking workflow: changes allowed freely, flagged for retroactive approval
- Application-level detection (no database triggers per RLS crisis lessons)

---

## Phase 1: Database Schema

**Migration:** `supabase/migrations/20260110000010_scope_monitoring_system.sql`

### New Tables

**1. scope_baselines** - Snapshot at sign-off
```sql
- id, project_id (unique), captured_at, captured_by
- deliverables_snapshot (JSONB array)
- total_estimated_hours, deliverable_count
```

**2. scope_change_comments** - Discussion on changes
```sql
- id, scope_change_id, user_id, content, timestamps
```

### Enhance Existing `scope_changes` Table
```sql
ALTER TABLE scope_changes ADD COLUMN:
- request_type (clarification | new_scope | reduction | timeline_change)
- requested_by, affected_deliverable_id
- change_delta (JSONB: {field, before, after, deliverable_title})
- hours_delta, cost_delta, timeline_delta_days
- baseline_id, baseline_deliverable_snapshot
- approved_by, approved_at, rejected_by, rejected_at, rejection_reason
```

### Helper Functions
- `capture_scope_baseline(project_id, user_id)` - Creates snapshot
- `get_active_baseline(project_id)` - Returns current baseline

### RLS Policies
- Anyone who can access project can view baselines/changes
- Anyone can INSERT scope changes (flag)
- Only admin/internal can UPDATE (approve/reject)

---

## Phase 2: API Layer

**Files:**
- `lib/types/scope-monitoring.ts` - Types (client-safe)
- `lib/api/scope-monitoring.ts` - Core functions

### Core Functions

```typescript
// Baseline
captureBaseline(projectId, capturedBy)
getBaseline(projectId)
hasBaseline(projectId)

// Scope Changes
flagScopeChange(input, flaggedBy, email, role)
autoFlagScopeChange(input, userId, email, role)  // Called from deliverable actions
getScopeChanges(projectId, filters?)
getScopeChangeDetails(id)
approveScopeChange(id, approvedBy, notes?)
rejectScopeChange(id, rejectedBy, reason)

// Comments
addScopeChangeComment(scopeChangeId, userId, content)
getScopeChangeComments(scopeChangeId)

// Metrics & Comparison
getScopeMetrics(projectId)
compareToBaseline(projectId)
```

### Server Actions

**File:** `features/projects/actions/scopeActions.ts`

```typescript
flagScopeChangeAction(input)           // Any role
approveScopeChangeAction(id, projectId, notes?)  // Admin only
rejectScopeChangeAction(id, projectId, reason)   // Admin only
addScopeChangeCommentAction(id, projectId, content)
captureBaselineAction(projectId)       // Called internally
```

---

## Phase 3: Integration Points

### 1. Capture Baseline on Sign-Off

**File:** `features/projects/actions/projectActions.ts`

In `updateProjectStatusAction`, when status changes to `signed_off`:
```typescript
if (newStatus === 'signed_off') {
  await captureBaseline(projectId, userId)
}
```

### 2. Auto-Detect Changes on Deliverable Updates

**File:** `features/projects/actions/deliverableActions.ts`

In `updateDeliverableAction`:
```typescript
// Before update: save current state
// After update: compare to baseline
// If changed: call autoFlagScopeChange()

Triggers:
- deliverable_modified (title/description changed)
- hours_increased (estimated_hours increased)
- timeline_extended (due_date pushed back)
```

In `addDeliverableAction`:
```typescript
// If baseline exists: flag as deliverable_added
```

In `deleteDeliverableAction`:
```typescript
// If baseline exists: flag as deliverable_removed
```

### 3. New Notification Types

**File:** `lib/api/notifications.ts`

Add types:
- `scope_change_flagged`
- `scope_change_approved`
- `scope_change_rejected`

---

## Phase 4: UI Components

**Directory:** `features/projects/components/scope/`

### Components to Build

| Component | Purpose |
|-----------|---------|
| `ScopeChangeStatusBadge` | pending_review / approved / rejected badges |
| `ScopeChangeTypeBadge` | clarification / new_scope / reduction badges |
| `ScopeChangeCard` | Expandable card with before/after diff, approve/reject buttons |
| `ScopeChangeDialog` | Flag new scope change (select deliverable, type, description) |
| `ScopeMetricsSummary` | Compact widget for Overview tab |
| `BaselineComparisonView` | Two-column baseline vs current diff |
| `RejectReasonDialog` | Rejection with required reason |

### ScopeTab

**File:** `features/projects/components/tabs/ScopeTab.tsx`

Structure:
1. Baseline section (when exists) - capture date, capturer, "View Comparison" link
2. Metrics row - 4 cards (Total, Pending, Approved, Net Hours)
3. Changes list with tabbed filters (All | Pending | Approved | Rejected)
4. "Flag Change" button (visible to all roles)

### Integration with Existing Tabs

**ProjectTabs.tsx:**
```typescript
<TabsTrigger value="scope">
  Scope
  {pendingCount > 0 && <Badge>{pendingCount}</Badge>}
</TabsTrigger>
```

**DeliverablesTab.tsx:**
- Add "Flagged" badge on deliverables with pending scope changes

**OverviewTab.tsx:**
- Add ScopeMetricsSummary widget after progress cards

---

## Phase 5: Admin Dashboard View (Optional)

**Route:** `/admin/scope-changes`

Global view of all pending scope changes across projects for quick triage.

---

## Implementation Order

1. **Database Migration** - Create tables, enums, functions, RLS
2. **Types** - `lib/types/scope-monitoring.ts`
3. **API Layer** - `lib/api/scope-monitoring.ts`
4. **Server Actions** - `features/projects/actions/scopeActions.ts`
5. **Integration** - Hook into projectActions and deliverableActions
6. **UI Components** - Build components in `features/projects/components/scope/`
7. **ScopeTab** - Main tab component
8. **Tab Integration** - Add to ProjectTabs, OverviewTab, DeliverablesTab
9. **Notifications** - Add new notification types and handlers

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/` | New migration file |
| `lib/types/scope-monitoring.ts` | NEW - Types |
| `lib/api/scope-monitoring.ts` | NEW - API functions |
| `lib/api/notifications.ts` | Add notification types |
| `features/projects/actions/scopeActions.ts` | NEW - Server actions |
| `features/projects/actions/projectActions.ts` | Hook baseline capture |
| `features/projects/actions/deliverableActions.ts` | Hook auto-detection |
| `features/projects/components/scope/*` | NEW - UI components |
| `features/projects/components/tabs/ScopeTab.tsx` | NEW - Tab component |
| `features/projects/components/ProjectTabs.tsx` | Add Scope tab trigger |
| `features/projects/components/tabs/OverviewTab.tsx` | Add metrics widget |

---

## Success Criteria

- [x] Baseline captured automatically at `signed_off`
- [x] Deliverable changes auto-flagged when baseline exists
- [x] Anyone can manually flag scope changes
- [x] Admin can approve/reject with notifications
- [x] Baseline vs current comparison view works
- [x] Metrics accurately reflect scope state
- [x] Activity log captures scope events

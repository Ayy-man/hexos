# Architecture Research

**Project:** hexOS Feature Extension
**Researched:** 2026-01-19
**Scope:** Notification System, Email Delivery, Gantt View, Scope Monitoring

---

## Executive Summary

This research documents the architectural approach for integrating four features into the existing hexOS system: enhanced notifications, email delivery, Gantt visualization, and scope monitoring. The existing codebase already has strong foundations: Supabase Realtime for notifications, a placeholder email module, a comprehensive scope monitoring system, and a deliverables model with dates/dependencies. The recommended approach extends these patterns rather than introducing new paradigms.

**Key Finding:** The scope monitoring system is already 80% complete with baseline capture, change detection, and approval workflow. The notification system has real-time infrastructure but needs email channel integration. Gantt is a new visualization of existing deliverable data.

---

## Notification System Architecture

### Current State

hexOS already has a functional in-app notification system:

| Component | Location | Status |
|-----------|----------|--------|
| Database table | `notifications` | Exists |
| Realtime subscription | `hooks/use-notifications-realtime.ts` | Exists |
| UI components | `components/notifications/` | Exists |
| API layer | `lib/api/notifications.ts` | Exists |
| Push notifications | `lib/push/send-notification.ts` | Exists |
| User preferences | `NotificationSettingsForm.tsx` | Exists (partial) |

### Current Data Flow

```
Event Trigger (Server Action)
    |
    v
createNotification() ──> INSERT into notifications table
    |                           |
    ├──> sendPushNotification() |
    |    (fire and forget)      |
    |                           v
    |                    Supabase Realtime
    |                           |
    |                           v
    |                    useNotificationsRealtime()
    |                           |
    |                           v
    |                    NotificationPopover
    |                    NotificationToast
    |
    v
(No email channel)
```

### Recommended Architecture Enhancement

Add email channel to existing notification pipeline:

```
Event Trigger (Server Action)
    |
    v
createNotification()
    |
    ├──> INSERT notifications ──> Supabase Realtime ──> In-App UI
    |
    ├──> sendPushNotification() ──> Web Push API
    |
    └──> shouldSendEmail(userId, type)
              |
              ├── YES ──> queueEmail() ──> email_queue table
              |                                  |
              |                                  v
              |                           Scheduled job
              |                           (Supabase Edge Function)
              |                                  |
              |                                  v
              |                           Resend API
              |
              └── NO ──> (skip)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `createNotification()` | Unified notification creation | Database, Push service, Email queue |
| `NotificationPreferencesService` | Check user opt-in/out | Profiles table |
| `email_queue` table | Persist pending emails | Edge function reads |
| `send-queued-emails` Edge Function | Batch process queue | Resend API |
| `Resend` | External email delivery | N/A |

### Database Schema Enhancement

```sql
-- Email queue for reliable delivery
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id),
  user_id UUID REFERENCES profiles(id),
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  template_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for queue processing
CREATE INDEX idx_email_queue_status ON email_queue(status, created_at)
WHERE status = 'pending';
```

### Notification Preferences Model

Extend existing `notification_preferences` JSONB in profiles:

```typescript
interface NotificationPreferences {
  in_app: {
    project_updates: boolean
    deliverable_completed: boolean
    mentions: boolean
    direct_messages: boolean
    inquiry_updates: boolean
    payment_updates: boolean
  }
  email: {
    project_updates: boolean
    deliverable_completed: boolean
    mentions: boolean
    direct_messages: boolean
    inquiry_updates: boolean
    payment_updates: boolean
    weekly_digest: boolean
  }
  // Future: push, whatsapp
}
```

### Integration Points

1. **Existing triggers (already create notifications):**
   - `approveScopeChange()` - scope_change_approved
   - `rejectScopeChange()` - scope_change_rejected
   - `projectActions.ts` - project_assigned, status_change
   - `blockerActions.ts` - blocker_acknowledged, blocker_resolved

2. **Add email dispatch to `createNotification()`:**
   - Check preferences
   - Queue email if opted in
   - Fire and forget (don't block notification creation)

---

## Email Delivery Architecture

### Current State

Email module exists as placeholder:
- Location: `lib/api/email.ts`
- Templates defined: invitation, application-received, application-approved, application-rejected
- Implementation: Console.log only (TODO marker for Resend)

### Recommended Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Email Provider | [Resend](https://resend.com/nextjs) | Official Next.js support, React Email templates, webhook delivery tracking |
| Template Engine | React Email | Type-safe templates, component reuse |
| Queue | Supabase table + Edge Function | No external queue (Inngest/BullMQ) needed at current scale |
| Delivery Tracking | Resend Webhooks | Delivery, bounce, open, click events |

### Architecture Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Email Delivery Pipeline                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Notification │    │ Direct Email │    │ Scheduled Digest     │  │
│  │   Trigger    │    │   Trigger    │    │   (Cron)             │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘  │
│         │                   │                        │              │
│         └─────────┬─────────┴────────────────────────┘              │
│                   │                                                  │
│                   v                                                  │
│         ┌─────────────────┐                                         │
│         │  email_queue    │  (Supabase table)                       │
│         │  - pending      │                                         │
│         │  - template     │                                         │
│         │  - data         │                                         │
│         └────────┬────────┘                                         │
│                  │                                                   │
│                  v                                                   │
│         ┌─────────────────┐    ┌──────────────────────────────┐     │
│         │ Edge Function   │───>│ Resend API                   │     │
│         │ (every 1 min)   │    │ - Send email                 │     │
│         └─────────────────┘    │ - Get delivery status        │     │
│                                └──────────┬───────────────────┘     │
│                                           │                          │
│                                           v                          │
│                                ┌──────────────────────┐              │
│                                │ Webhook endpoint     │              │
│                                │ /api/webhooks/resend │              │
│                                └──────────┬───────────┘              │
│                                           │                          │
│                                           v                          │
│                                ┌──────────────────────┐              │
│                                │ email_queue.status   │              │
│                                │ Update: sent/failed  │              │
│                                │ + email_events log   │              │
│                                └──────────────────────┘              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Template Structure

```
/emails/
├── components/          # Shared components
│   ├── EmailLayout.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── templates/
│   ├── invitation.tsx
│   ├── application-received.tsx
│   ├── application-approved.tsx
│   ├── notification-digest.tsx      # Weekly digest
│   ├── project-update.tsx           # Status change
│   ├── deliverable-completed.tsx
│   ├── mention.tsx
│   └── scope-change.tsx
└── index.ts             # Template registry
```

### Queue Processing Strategy

**Why queue vs direct send:**
1. Reliability: If Resend is down, emails don't get lost
2. Rate limiting: Control send rate to stay within API limits
3. Retry logic: Failed sends can be retried automatically
4. Audit trail: All email attempts logged

**Edge Function schedule:** Every 1 minute, process up to 50 pending emails.

**Retry policy:**
- Max 3 attempts
- Exponential backoff: 1min, 5min, 15min
- After 3 failures: mark as failed, alert admin

---

## Gantt View Architecture

### Current State

No Gantt implementation exists, but data model supports it:

| Field | Table | Type |
|-------|-------|------|
| `start_date` | `deliverables` | DATE |
| `due_date` | `deliverables` | DATE |
| `parent_id` | `deliverables` | UUID (supports hierarchy) |
| `sort_order` | `deliverables` | INTEGER |
| `status` | `deliverables` | TEXT |
| `estimated_hours` | `deliverables` | DECIMAL |

### Library Recommendation

**Primary choice: [SVAR React Gantt](https://svar.dev/react/gantt/)** (MIT license)

| Criteria | SVAR | gantt-task-react | DHTMLX |
|----------|------|------------------|--------|
| License | MIT (free) | MIT (free) | Commercial ($599+) |
| TypeScript | Yes (v2.3+) | Yes | Yes |
| React 19 | Yes | Uncertain | Yes |
| Dependencies | Small | Small | Large |
| Features | Drag, zoom, dependencies | Basic | Full-featured |
| Bundle size | ~50KB | ~30KB | ~300KB |

**Rationale:** SVAR provides the best balance of features, TypeScript support, and zero cost. For hexOS's needs (project visualization, not resource planning), commercial libraries are overkill.

### Data Model for Gantt

The existing `deliverables` table is sufficient. Map to Gantt format:

```typescript
interface GanttTask {
  id: string
  text: string          // from deliverable.title
  start: Date           // from deliverable.start_date
  end: Date             // from deliverable.due_date
  progress: number      // calculated from status (0-100)
  parent?: string       // from deliverable.parent_id
  type?: 'task' | 'milestone' | 'project'
  duration?: number     // days
  color?: string        // from status or custom
}

function mapDeliverableToGanttTask(d: Deliverable): GanttTask {
  return {
    id: d.id,
    text: d.title,
    start: d.start_date ? new Date(d.start_date) : new Date(),
    end: d.due_date ? new Date(d.due_date) : addDays(new Date(), 7),
    progress: statusToProgress(d.status),
    parent: d.parent_id || undefined,
    color: statusToColor(d.status),
  }
}
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GanttTab Component                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ GanttToolbar                                                  │   │
│  │ - View mode: Day | Week | Month                               │   │
│  │ - Zoom controls                                               │   │
│  │ - Filter: All | In Progress | Overdue                         │   │
│  │ - Compare to baseline toggle                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ GanttChart (SVAR React Gantt)                                 │   │
│  │                                                                │   │
│  │  [Task List Panel]  |  [Timeline Chart]                       │   │
│  │                     |                                         │   │
│  │  Deliverable A      |  ████████░░░░░░░░░░                     │   │
│  │    └─ Sub-task 1    |    ████░░░░                             │   │
│  │    └─ Sub-task 2    |         ████████                        │   │
│  │  Deliverable B      |            ████████████                 │   │
│  │                     |                                         │   │
│  │  [Baseline overlay shown as thin lines if enabled]            │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ GanttLegend                                                   │   │
│  │ - Status colors                                               │   │
│  │ - Baseline vs current                                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
features/projects/components/gantt/
├── GanttTab.tsx           # Main tab container
├── GanttChart.tsx         # SVAR Gantt wrapper
├── GanttToolbar.tsx       # Controls
├── GanttLegend.tsx        # Status legend
├── hooks/
│   └── useGanttData.ts    # Data transformation
├── utils/
│   ├── mappers.ts         # Deliverable -> GanttTask
│   └── baseline.ts        # Baseline comparison logic
└── types.ts               # TypeScript interfaces
```

### Performance Considerations

1. **Virtualization:** SVAR handles large datasets internally
2. **Data loading:** Fetch deliverables with project data (already done)
3. **Realtime updates:** Use existing deliverables realtime subscription
4. **Baseline overlay:** Load scope_baseline only when toggled on

### Interaction Design

| Action | Behavior | Permission |
|--------|----------|------------|
| Drag task horizontally | Update start/end dates | Admin, Internal |
| Drag progress bar | Update status progress | Admin, Internal, Dev |
| Click task | Open deliverable detail | All |
| Resize task | Update duration | Admin, Internal |
| Create dependency | Not supported (MVP) | N/A |

**Note:** Task dependencies (arrows) are out of scope for MVP. The `parent_id` relationship is for hierarchy, not schedule dependencies.

---

## Scope Monitoring Architecture

### Current State (Already Implemented)

The scope monitoring system is **substantially complete**:

| Feature | Status | Location |
|---------|--------|----------|
| Baseline capture | Done | `captureBaseline()` in `lib/api/scope-monitoring.ts` |
| Baseline storage | Done | `scope_baselines` table |
| Manual flagging | Done | `flagScopeChange()` |
| Auto-detection | Done | `autoFlagScopeChange()` |
| Approval workflow | Done | `approveScopeChange()`, `rejectScopeChange()` |
| Comments | Done | `scope_change_comments` table |
| Metrics | Done | `getScopeMetrics()` |
| Comparison | Done | `compareToBaseline()` |
| Notifications | Partial | Creates notifications, no email |

### Existing Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Scope Monitoring Pipeline                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BASELINE CAPTURE (at sign-off):                                     │
│  ┌────────────────┐    ┌──────────────────────────────────────┐     │
│  │ Admin triggers │───>│ capture_scope_baseline() RPC         │     │
│  │ sign-off       │    │ - Snapshots all deliverables         │     │
│  └────────────────┘    │ - Stores hours, count, timeline      │     │
│                        │ - One baseline per project (upsert)  │     │
│                        └──────────────────────────────────────┘     │
│                                                                      │
│  CHANGE DETECTION (ongoing):                                         │
│                                                                      │
│  ┌─────────────────┐                                                 │
│  │ Deliverable     │                                                 │
│  │ Action          │                                                 │
│  │ (update/add/    │                                                 │
│  │  remove)        │                                                 │
│  └────────┬────────┘                                                 │
│           │                                                          │
│           v                                                          │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐    │
│  │ hasBaseline()?  │───>│ YES: autoFlagScopeChange()           │    │
│  │                 │    │ - Compare to baseline snapshot        │    │
│  │                 │    │ - Create scope_change record         │    │
│  │                 │    │ - Status: pending_review              │    │
│  │                 │    └──────────────────────────────────────┘    │
│  │                 │                                                 │
│  │                 │───>│ NO: Skip (no baseline to compare)    │    │
│  └─────────────────┘                                                 │
│                                                                      │
│  APPROVAL WORKFLOW:                                                  │
│                                                                      │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐     │
│  │ pending_review │───>│ Admin reviews  │───>│ approved OR    │     │
│  │                │    │ in Scope tab   │    │ rejected       │     │
│  └────────────────┘    └────────────────┘    └────────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### What Needs Enhancement

| Area | Current | Enhancement |
|------|---------|-------------|
| UI | Basic | Polish ScopeTab, add comparison view |
| Trigger coverage | Partial | Ensure ALL deliverable mutations call autoFlag |
| Email notifications | None | Add to notification email channel |
| Gantt integration | None | Show baseline vs current overlay |

### Trigger Integration Points

Ensure these actions call `autoFlagScopeChange()`:

```typescript
// In features/projects/actions/deliverableActions.ts

// 1. Update deliverable
export async function updateDeliverableAction(id: string, data: UpdateInput) {
  const result = await updateDeliverable(id, data)

  // Auto-flag if baseline exists
  if (data.estimated_hours || data.due_date || data.title) {
    await autoFlagScopeChange({
      project_id: result.project_id,
      trigger_type: getTriggerType(data), // hours_increased, timeline_extended, etc.
      affected_deliverable_id: id,
      deliverable_title: result.title,
      change_delta: computeDelta(before, after),
      hours_delta: data.estimated_hours ? after.estimated_hours - before.estimated_hours : null,
    })
  }
  return result
}

// 2. Create deliverable
export async function createDeliverableAction(data: CreateInput) {
  const result = await createDeliverable(data)

  await autoFlagScopeChange({
    project_id: data.project_id,
    trigger_type: 'deliverable_added',
    affected_deliverable_id: result.id,
    deliverable_title: result.title,
    change_delta: { field: 'deliverable', before: null, after: result.title },
    hours_delta: result.estimated_hours,
  })
  return result
}

// 3. Delete deliverable
export async function deleteDeliverableAction(id: string) {
  const before = await getDeliverable(id)
  await deleteDeliverable(id)

  await autoFlagScopeChange({
    project_id: before.project_id,
    trigger_type: 'deliverable_removed',
    affected_deliverable_id: id,
    deliverable_title: before.title,
    change_delta: { field: 'deliverable', before: before.title, after: null },
    hours_delta: -(before.estimated_hours || 0),
  })
}
```

### Scope Tab UI Enhancement

```
┌─────────────────────────────────────────────────────────────────────┐
│ Scope Monitoring Tab                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Metrics Cards                                                 │   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │
│  │ │ Pending  │ │ Approved │ │ Rejected │ │ Net Hrs  │          │   │
│  │ │    3     │ │    12    │ │    2     │ │   +24h   │          │   │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Baseline Comparison (toggle)                                  │   │
│  │                                                                │   │
│  │  Baseline: 45h, 8 deliverables (captured Jan 5)               │   │
│  │  Current:  69h, 10 deliverables                               │   │
│  │  Delta:   +24h, +2 deliverables                               │   │
│  │                                                                │   │
│  │  + 2 added, - 0 removed, ~ 3 modified                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Change Log                                      [Filter: All] │   │
│  │                                                                │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ [Pending] Hours increased on "API Integration"         │   │   │
│  │  │ 10h -> 18h (+8h) | Flagged by John | Jan 15             │   │   │
│  │  │ [Approve] [Reject] [Comment]                           │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │                                                                │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ [Approved] New deliverable added: "Mobile App"         │   │   │
│  │  │ +15h | Approved by Admin | Jan 12                       │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Build Order

Based on dependencies between components, recommended implementation sequence:

### Phase 1: Email Infrastructure (Foundation)

**Dependencies:** None (standalone)
**Deliverables:**
1. Install Resend + React Email
2. Create `email_queue` table
3. Build email templates (start with invitation)
4. Create Edge Function for queue processing
5. Add webhook endpoint for delivery tracking
6. Update existing `sendEmail()` to use Resend

**Why first:** Email is foundation for notification emails. Currently a TODO stub.

### Phase 2: Notification Email Channel

**Dependencies:** Phase 1 (email infrastructure)
**Deliverables:**
1. Extend `createNotification()` to check email preferences
2. Queue email when notification created
3. Add notification-specific templates
4. Test end-to-end: action -> notification -> email

**Why second:** Builds on Phase 1, completes notification pipeline.

### Phase 3: Gantt Visualization

**Dependencies:** None (data exists)
**Deliverables:**
1. Install SVAR React Gantt
2. Create `GanttTab` component structure
3. Build data transformation layer
4. Implement drag-to-edit interactions
5. Add baseline overlay toggle

**Why third:** Independent feature, can be done in parallel with Phase 2.

### Phase 4: Scope Monitoring Polish

**Dependencies:** Phase 3 (for Gantt baseline overlay)
**Deliverables:**
1. Audit all deliverable actions for autoFlag coverage
2. Polish Scope tab UI
3. Add baseline vs current comparison view
4. Integrate baseline overlay into Gantt
5. Add scope change email notifications (Phase 2 dependency)

**Why fourth:** Scope system exists but needs integration polish.

### Dependency Graph

```
                 ┌─────────────────┐
                 │ Phase 1: Email  │
                 │ Infrastructure  │
                 └────────┬────────┘
                          │
                          v
                 ┌─────────────────┐
                 │ Phase 2:        │
                 │ Notification    │
                 │ Email Channel   │
                 └────────┬────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         v                                 v
┌─────────────────┐              ┌─────────────────┐
│ Phase 3: Gantt  │              │ Phase 4: Scope  │
│ (parallel)      │─────────────>│ Polish          │
└─────────────────┘              └─────────────────┘
```

---

## Integration Summary

### Data Flow Connections

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Feature Integration Map                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DELIVERABLES TABLE (central data)                                   │
│         │                                                            │
│         ├──────────> Gantt View (visualization)                      │
│         │                                                            │
│         ├──────────> Hill Chart (existing, progress)                 │
│         │                                                            │
│         └──────────> Scope Monitoring (change detection)             │
│                           │                                          │
│                           v                                          │
│                    NOTIFICATIONS TABLE                               │
│                           │                                          │
│                           ├──> In-App (existing)                     │
│                           │                                          │
│                           ├──> Push (existing)                       │
│                           │                                          │
│                           └──> Email (new)                           │
│                                   │                                  │
│                                   v                                  │
│                            EMAIL_QUEUE TABLE                         │
│                                   │                                  │
│                                   v                                  │
│                            Resend API                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Shared Components

| Component | Used By |
|-----------|---------|
| `deliverables` table | Gantt, Hill Chart, Scope Monitoring |
| `scope_baselines` table | Scope Monitoring, Gantt (overlay) |
| `notifications` table | In-App, Push, Email |
| `createNotification()` | All features |
| `useNotificationsRealtime()` | Notification UI |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Notification System | HIGH | Existing system well-understood, enhancement path clear |
| Email Delivery | HIGH | Resend docs verified, pattern established |
| Gantt Visualization | MEDIUM | SVAR chosen based on web research, not Context7 |
| Scope Monitoring | HIGH | Already implemented, just needs polish |

---

*Research completed: 2026-01-19*

# Phase 14: Offboarding & Retainer System - Research

**Researched:** 2026-02-09
**Domain:** Project lifecycle management, retainer mode, status system extension
**Confidence:** HIGH

## Summary

This phase extends the project lifecycle to support two post-delivery paths: full completion or transition to retainer mode. All projects gain a Future Improvements backlog regardless of status. The system adds a new `retainer` status (not currently in the enum), retainer-specific UI with check-ins and lightweight tasks, and completion ceremonies with artifact archival.

The existing codebase provides strong patterns for all required features: status system with phases and transitions, notification types with extension pattern, tab-based navigation with conditional visibility, conversation/task patterns from suggestions system, and comprehensive RLS policies for team-scoped data. No cron infrastructure exists yet, so check-in reminders will require a new scheduled job pattern.

**Primary recommendation:** Extend the project status enum to include `retainer`, add retainer-specific tables (check-ins, tasks, improvements), implement tab navigation on Projects page, and establish cron job infrastructure for check-in reminders.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase | Current | Backend (database, auth, realtime, cron) | Already integrated for all data operations, RLS, and scheduled functions |
| PostgreSQL | 15+ | Database with enum types | Required by Supabase, supports custom types for status enums |
| Next.js 15 | 15.x | App Router with server/client components | Project's framework, server actions for mutations |
| shadcn/ui | Current | UI components (Tabs, Badge, Card, Dialog) | Project's component library, used throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Framer Motion | Current | Tab transitions, modal animations | Already used in ProjectTabs and modals |
| date-fns | Current | Date formatting and relative time | Used across app for date operations |
| Sonner | Current | Toast notifications | Standard for user feedback |
| Lucide React | Current | Icons (Clock, CheckCircle, AlertCircle, etc.) | Project's icon library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Cron | External cron service | Supabase pg_cron keeps everything in one platform, simpler auth |
| Custom task table | Reuse deliverables table | Retainer tasks are lightweight and separate domain - cleaner to isolate |
| New retainer_projects table | Add columns to projects | Extends existing table maintains single source of truth, easier queries |

**Installation:**
```bash
# No new packages required - all dependencies already installed
# Will need Supabase migrations for:
# - Extend project_status enum with 'retainer'
# - Create retainer_check_ins table
# - Create retainer_tasks table
# - Create project_improvements table
# - Add retainer config columns to projects table
```

## Architecture Patterns

### Recommended Project Structure
```
app/(dashboard)/projects/
├── page.tsx                      # Add tab navigation (Active/Retainer/Completed)
├── [id]/page.tsx                 # Existing project detail page

features/projects/
├── actions/
│   ├── projectActions.ts         # Extend with retainer actions
│   ├── retainerActions.ts        # NEW: check-ins, tasks, transitions
│   └── improvementActions.ts     # NEW: future improvements CRUD
├── components/
│   ├── ProjectTabs.tsx           # Conditionally hide tabs for retainer/completed
│   ├── ProjectStatusControl.tsx  # Extend transitions for retainer/completed
│   ├── retainer/                 # NEW: Retainer-specific components
│   │   ├── RetainerDashboard.tsx
│   │   ├── CheckInsTab.tsx
│   │   ├── RetainerTasksTab.tsx
│   │   ├── LogCheckInDialog.tsx
│   │   └── RetainerConfigDialog.tsx
│   ├── improvements/             # NEW: Future Improvements components
│   │   ├── ImprovementsSection.tsx
│   │   ├── CreateImprovementDialog.tsx
│   │   └── ConvertToProjectDialog.tsx
│   └── completion/               # NEW: Completion ceremony components
│       ├── CloseProjectDialog.tsx
│       └── CompletionSummary.tsx

lib/api/
├── projects.ts                   # Extend ProjectStatus type
├── retainer-check-ins.ts         # NEW: Check-in CRUD operations
├── retainer-tasks.ts             # NEW: Task CRUD operations
├── project-improvements.ts       # NEW: Improvements CRUD operations
└── notifications.ts              # Extend with retainer notification types

supabase/migrations/
└── YYYYMMDD_retainer_system.sql  # New tables, enum extension, RLS policies
```

### Pattern 1: Status Extension with New Phase
**What:** Add `retainer` to ProjectStatus enum and STATUS_PHASES configuration
**When to use:** When adding a new project lifecycle state that requires different UI and capabilities
**Example:**
```typescript
// lib/api/projects.ts
export type ProjectStatus =
  // ... existing statuses ...
  | 'accepted'
  // Retainer
  | 'retainer'
  // Closed
  | 'completed' | 'cancelled' | 'on_hold'

// lib/utils/projectPhases.ts
export const STATUS_PHASES = {
  // ... existing phases ...
  delivery: ['delivered', 'acceptance_pending', 'accepted'],
  retainer: ['retainer'], // NEW PHASE
  closed: ['completed', 'cancelled', 'on_hold'],
} as const
```

### Pattern 2: Tab Navigation with Filter State
**What:** Horizontal tabs using URL query params for active/retainer/completed filtering
**When to use:** When you need client-side filtering with URL state preservation
**Example:**
```typescript
// app/(dashboard)/projects/page.tsx (adapted pattern)
interface ProjectsPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    view?: 'active' | 'retainer' | 'completed' // NEW: tab filter
  }>
}

// Filter projects based on status category
const getStatusCategory = (status: string) => {
  if (status === 'retainer') return 'retainer'
  if (['completed', 'cancelled'].includes(status)) return 'completed'
  return 'active'
}

// Tabs UI with Link-based navigation
<Tabs value={view} className="w-full">
  <TabsList>
    <TabsTrigger value="active" asChild>
      <Link href="/projects?view=active">Active</Link>
    </TabsTrigger>
    <TabsTrigger value="retainer" asChild>
      <Link href="/projects?view=retainer">Retainer</Link>
    </TabsTrigger>
    <TabsTrigger value="completed" asChild>
      <Link href="/projects?view=completed">Completed</Link>
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### Pattern 3: Conditional Tab Visibility Based on Status
**What:** Show/hide project detail tabs based on project status using helper functions
**When to use:** When different project phases require different UI capabilities
**Example:**
```typescript
// features/projects/components/ProjectTabs.tsx (existing pattern)
const showOnboardingTab = isOnboardingPhase(project.status)
const showTestingTab = (project.deliverables || []).some((d) => d.hill_position >= 90)
const showRetainerTabs = project.status === 'retainer' // NEW
const showDevelopmentTabs = !showOnboardingTab && !showRetainerTabs // MODIFIED

// Hide development artifacts for retainer/completed
{!showRetainerTabs && project.status !== 'completed' && (
  <TabsTrigger value="progress">Progress</TabsTrigger>
)}
```

### Pattern 4: Lightweight Task System with Conversations
**What:** Simple task records (title, status, priority) linked to a conversation thread, inspired by suggestions system
**When to use:** When you need lightweight task tracking with discussion capability
**Example:**
```typescript
// lib/api/retainer-tasks.ts (pattern from suggestions)
export interface RetainerTask {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  assignee_id: string | null
  conversation_id: string | null // Links to conversations table
  created_by: string
  created_at: string
  completed_at: string | null
}

// Reuse existing conversation pattern
export async function getTaskConversation(taskId: string) {
  // Same pattern as getSuggestionConversation
  const task = await getTask(taskId)
  if (!task.conversation_id) {
    // Auto-create conversation if needed
    const conversation = await createConversation({
      type: 'retainer_task',
      retainer_task_id: taskId
    })
    task.conversation_id = conversation.id
  }
  return getConversation(task.conversation_id)
}
```

### Pattern 5: Notification Type Extension
**What:** Add new notification types following established enum extension and handler pattern
**When to use:** When adding new event types that require user notifications
**Example:**
```typescript
// lib/api/notifications-utils.ts (extend existing)
export type NotificationType =
  | 'project_assigned'
  // ... existing types ...
  | 'suggestion_status_change'
  // NEW: Retainer notifications
  | 'retainer_check_in_due'
  | 'retainer_check_in_overdue'
  | 'retainer_task_assigned'
  | 'retainer_health_warning'
  | 'project_completed'
  | 'project_moved_to_retainer'

// Add icon and color mappings
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    // ... existing cases ...
    case 'retainer_check_in_due':
    case 'retainer_check_in_overdue':
      return 'clock'
    case 'retainer_task_assigned':
      return 'check-square'
    case 'retainer_health_warning':
      return 'alert-triangle'
    case 'project_completed':
      return 'check-circle'
    case 'project_moved_to_retainer':
      return 'refresh-cw'
    default:
      return 'bell'
  }
}

// Add URL routing
export function getNotificationUrl(notification: Notification): string {
  switch (notification.type) {
    case 'retainer_check_in_due':
    case 'retainer_check_in_overdue':
      return `/projects/${notification.project_id}?tab=check-ins`
    case 'retainer_task_assigned':
      return `/projects/${notification.project_id}?tab=tasks`
    // ... etc
  }
}
```

### Pattern 6: Server Action with Structured Result
**What:** Server actions return `{ data?, error? }` instead of throwing, following established pattern
**When to use:** All mutations from client components
**Example:**
```typescript
// features/projects/actions/retainerActions.ts
'use server'

export async function logCheckInAction(params: {
  projectId: string
  health: 'green' | 'yellow' | 'red'
  notes: string
}) {
  try {
    const checkIn = await logCheckIn(params)

    // Send notifications to assigned roles
    await notifyCheckIn(params.projectId, params.health)

    revalidatePath(`/projects/${params.projectId}`)
    return { data: checkIn }
  } catch (error) {
    console.error('[logCheckInAction]', error)
    return { error: 'Failed to log check-in' }
  }
}
```

### Pattern 7: Compact Stat Card Layout
**What:** Minimal padding Card component for dense information display
**When to use:** Dashboard KPIs, summary stats, retainer health indicators
**Example:**
```typescript
// Retainer dashboard card (pattern from OverviewTab)
<Card className="py-3">
  <CardContent className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Last Check-in</span>
      <div className={cn(
        "h-3 w-3 rounded-full",
        healthColor === 'green' && "bg-success",
        healthColor === 'yellow' && "bg-warning",
        healthColor === 'red' && "bg-error"
      )} />
    </div>
    <div className="text-2xl font-semibold">{relativeDays} days ago</div>
    <p className="text-xs text-muted-foreground">{author}</p>
  </CardContent>
</Card>
```

### Anti-Patterns to Avoid
- **Don't create separate retainer_projects table:** Extends projects table to maintain single source of truth and simplify queries across all project types
- **Don't reuse deliverables for retainer tasks:** Deliverables are development-focused with hill chart integration; retainer tasks are simpler and different domain
- **Don't store retainer config in JSON column:** Use typed columns (check_in_cadence enum, assignee arrays) for type safety and queryability
- **Don't skip RLS on retainer tables:** All retainer data must respect team visibility (dev sees only assigned, DFY sees only own, admin sees all)
- **Don't allow status transitions without validation:** `accepted → retainer` requires retainer setup, `retainer → completed` requires task resolution prompt

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scheduled check-in reminders | Custom polling or setInterval | Supabase pg_cron with Edge Function | Built-in, reliable, supports timezone-aware scheduling, automatic retry |
| Retainer task conversations | Custom comment system | Extend existing conversations table | Already has RLS, realtime, mentions, reactions - proven pattern |
| Date arithmetic for cadence | Manual date math | date-fns add/sub functions | Handles edge cases (month-end, leap years, DST) correctly |
| Health status color logic | Inline conditional className | statusConfig object pattern | Centralized, type-safe, reusable across components |
| Notification deduplication | In-memory tracking | Database-backed shown_as_toast_at field | Persists across sessions, prevents duplicate toasts on refresh |
| Team member filtering | Manual array filtering | RLS policies with role-based visibility | Database-level security, can't be bypassed by client code |

**Key insight:** The project already has robust infrastructure for status management, notifications, conversations, and team-scoped data visibility. Retainer features should extend these patterns rather than introduce new architectures. The only genuinely new requirement is scheduled jobs (cron), which Supabase provides via pg_cron.

## Common Pitfalls

### Pitfall 1: Forgetting to Hide Development Artifacts
**What goes wrong:** Retainer and completed projects show Hill Chart, Testing tab, Deliverables detail - creating confusion since those are development-phase tools
**Why it happens:** ProjectTabs currently only conditionally hides Onboarding tab; other tabs always show
**How to avoid:** Add status-based guards on development-specific tabs and modify visibility conditions
**Warning signs:** User asks "why does completed project still have progress tracking?"
**Fix:**
```typescript
// ProjectTabs.tsx
const showDevelopmentTabs = !isOnboardingPhase(project.status) &&
                           project.status !== 'retainer' &&
                           project.status !== 'completed'

{showDevelopmentTabs && (
  <>
    <TabsTrigger value="progress">Progress</TabsTrigger>
    {showTestingTab && <TabsTrigger value="testing">Testing</TabsTrigger>}
  </>
)}
```

### Pitfall 2: Silent Dev Removal Creates Orphaned Data
**What goes wrong:** Admin removes dev from retainer, dev's tasks show "unassigned", conversations lose context
**Why it happens:** Only updating dev_assignments without cascading to related records
**How to avoid:** Transaction that updates tasks (unassign), preserves conversation access (dev can see their messages), logs removal in activity
**Warning signs:** Dev complains they lost access to conversations they participated in
**Fix:**
```typescript
// Removal should:
// 1. Remove from dev_assignments array
// 2. Unassign from all retainer_tasks
// 3. Preserve conversation access (don't delete participant records)
// 4. Log activity "Dev removed from retainer (silent)"
// 5. Update RLS so removed dev loses project access but keeps conversation history
```

### Pitfall 3: Check-in Cadence Drift
**What goes wrong:** Weekly check-ins scheduled for "every Monday" gradually drift to Tuesday, Wednesday as team logs late
**Why it happens:** Next due date calculated from logged_at instead of previous_due_date
**How to avoid:** Calculate next due date from the cadence anchor, not from when user actually logged
**Warning signs:** "Weekly" check-ins end up 10+ days apart
**Fix:**
```typescript
// WRONG: next_due = today + cadence (drifts)
const nextDue = addDays(new Date(), cadenceDays)

// CORRECT: next_due = last_due + cadence (anchored)
const nextDue = addDays(lastCheckIn.due_date, cadenceDays)
```

### Pitfall 4: Completion Summary Loses Context
**What goes wrong:** Completion ceremony shows counts but loses detail - "20 deliverables completed" but can't see what they were
**Why it happens:** Summary stored as aggregates only, no link to underlying records
**How to avoid:** Store summary as rich data structure with IDs, preserve archived records in separate table or expanded JSON
**Warning signs:** Admin asks "which 3 devs worked on this?" and can only see count=3
**Fix:**
```typescript
interface CompletionSummary {
  total_deliverables: number
  deliverable_titles: string[] // Preserve detail
  team_members: { id: string; name: string }[] // Not just count
  timeline_days: number
  start_date: string
  completion_date: string
  scope_changes_count: number
  // Store full context, not just aggregates
}
```

### Pitfall 5: Wrong Tab Active After Status Change
**What goes wrong:** Project moves to retainer, user still sees "Progress" tab which is now hidden - breaks navigation
**Why it happens:** Tab state not reset when available tabs change
**How to avoid:** Reset to default tab when status changes affect tab visibility
**Warning signs:** User sees empty content area after status change, browser console shows "Tab not found"
**Fix:**
```typescript
// ProjectPageClient.tsx
useEffect(() => {
  const showRetainerTabs = project.status === 'retainer'
  const showCompletedView = project.status === 'completed'

  // Reset to safe default tab if current tab becomes unavailable
  if ((showRetainerTabs || showCompletedView) &&
      ['progress', 'deliverables', 'testing'].includes(activeTab)) {
    setActiveTab(showRetainerTabs ? 'check-ins' : 'overview')
  }
}, [project.status])
```

### Pitfall 6: RLS Policies Don't Cover Edge Cases
**What goes wrong:** Dev can access retainer after removal, or DFY can see retainer for project they're not assigned to
**Why it happens:** RLS policies check current state (assigned_dev_id) but don't account for historical access or multiple assignment types
**How to avoid:** Test RLS policies for: removed dev, reassigned DFY, project handoff scenarios
**Warning signs:** Security audit reveals data leakage, user reports seeing data they shouldn't
**Fix:**
```sql
-- retainer_tasks RLS: Must check retainer config, not just project.assigned_dev_id
CREATE POLICY "Dev can view retainer tasks if assigned to retainer"
  ON retainer_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = retainer_tasks.project_id
      AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'dfy' AND p.dfy_partner_id = auth.uid())
        OR (get_user_role() = 'dev' AND auth.uid() = ANY(p.retainer_dev_ids)) -- NEW COLUMN
      )
    )
  );
```

### Pitfall 7: Cron Job Creates Duplicate Notifications
**What goes wrong:** Check-in reminder sent every hour because cron runs hourly and check is "is due_date <= today"
**Why it happens:** Cron logic doesn't track whether notification already sent
**How to avoid:** Store last_reminded_at on check-in records, only notify if never reminded or overdue threshold crossed
**Warning signs:** Users report spam of "check-in due" notifications for same project
**Fix:**
```sql
-- Cron function should:
-- 1. Find check-ins where due_date <= today AND last_reminded_at IS NULL
-- 2. Send notifications
-- 3. UPDATE retainer_check_ins SET last_reminded_at = NOW()
-- 4. For overdue (due_date < today - 3 days), send escalation if not already escalated
```

## Code Examples

Verified patterns from the codebase:

### Status Badge with Config Object
```typescript
// Pattern from features/inquiries/components/deliverables/DeliverableStatusBadge.tsx
const STATUS_CONFIG: Record<
  ProjectStatus,
  { icon: React.ElementType; label: string; className: string }
> = {
  retainer: {
    icon: RefreshCw,
    label: 'Retainer',
    className: 'bg-info-muted text-info-foreground'
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    className: 'bg-success-muted text-success-foreground'
  },
  // ... other statuses
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  return (
    <Badge className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}
```

### Lazy Tab Data Loading
```typescript
// Pattern from ProjectTabs: Load data when tab activates
const [checkIns, setCheckIns] = useState<CheckIn[]>([])
const [isLoadingCheckIns, setIsLoadingCheckIns] = useState(false)

useEffect(() => {
  if (activeTab === 'check-ins' && checkIns.length === 0 && !isLoadingCheckIns) {
    setIsLoadingCheckIns(true)
    getRetainerCheckIns(project.id)
      .then(setCheckIns)
      .catch(console.error)
      .finally(() => setIsLoadingCheckIns(false))
  }
}, [activeTab])
```

### Status Transition Map with Validation
```typescript
// Pattern from ProjectStatusControl.tsx
const TRANSITIONS: Record<ProjectStatus, { next: ProjectStatus; label: string; primary?: boolean }[]> = {
  accepted: [
    { next: 'retainer', label: 'Move to Retainer', primary: false },
    { next: 'completed', label: 'Close Project', primary: true }
  ],
  retainer: [
    { next: 'completed', label: 'Complete Retainer', primary: true }
  ],
  completed: [
    { next: 'retainer', label: 'Convert to Retainer', primary: false }
  ],
  // ... other statuses
}

// Show transitions in dropdown
const availableTransitions = TRANSITIONS[currentStatus] || []
availableTransitions.map(({ next, label, primary }) => (
  <DropdownMenuItem onClick={() => confirmTransition(next)}>
    {label}
  </DropdownMenuItem>
))
```

### Notification Creation with Type Safety
```typescript
// Pattern from lib/api/notifications.ts
export async function createNotification(params: {
  userId: string
  type: NotificationType
  title: string
  message?: string
  projectId?: string
  deliverableId?: string
  blockerId?: string
  actorId?: string
}): Promise<Notification> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message || null,
      project_id: params.projectId || null,
      deliverable_id: params.deliverableId || null,
      blocker_id: params.blockerId || null,
      actor_id: params.actorId || null,
    })
    .select()
    .single()

  if (error) throw error

  // Also send push notification (fire and forget)
  sendPushNotification(params.userId, {
    title: params.title,
    body: params.message || '',
    url: params.projectId ? `/projects/${params.projectId}` : '/notifications',
    tag: params.type,
  }).catch(console.error)

  return data as Notification
}

// Usage for retainer check-in due
await createNotification({
  userId: assignedDevId,
  type: 'retainer_check_in_due',
  title: 'Weekly check-in due',
  message: `Check-in due for ${project.project_name}`,
  projectId: project.id,
  actorId: null, // System notification
})
```

### RLS Policy Pattern for Team-Scoped Data
```sql
-- Pattern from projects table RLS (supabase/migrations/20241221000001_initial_schema.sql)
CREATE POLICY "Devs can view assigned retainer projects"
  ON retainer_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = retainer_tasks.project_id
      AND (
        -- Admin sees all
        get_user_role() = 'admin'
        -- DFY sees own projects
        OR (get_user_role() = 'dfy' AND projects.dfy_partner_id = auth.uid())
        -- Dev sees if assigned to retainer
        OR (get_user_role() = 'dev' AND auth.uid() = ANY(projects.retainer_dev_ids))
      )
    )
  );

-- Similar pattern for mutations
CREATE POLICY "Assigned users can create retainer tasks"
  ON retainer_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = retainer_tasks.project_id
      AND projects.status = 'retainer'
      AND (
        get_user_role() IN ('admin', 'dfy')
        OR (get_user_role() = 'dev' AND auth.uid() = ANY(projects.retainer_dev_ids))
      )
    )
  );
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual cron jobs on server | Supabase pg_cron with Edge Functions | 2024+ | Cron is now native to Supabase, no separate infrastructure needed |
| Client-side polling for reminders | Database-triggered notifications | Phase 08 (notifications) | Server-controlled notification timing, reliable delivery |
| Separate enum type in DB + TypeScript | Manual TypeScript types mirroring DB | Current project standard | Avoids generated types, explicit type definitions in code |
| Global conversations table | Type-discriminated conversations | Phase 12 (suggestion conversations) | Single table with type field (`project`, `inquiry`, `suggestion`, now `retainer_task`) |
| Status stored as string | Status as enum with transition map | Current architecture | Type-safe, validates transitions, self-documenting flow |

**Deprecated/outdated:**
- **Supabase generated types:** Project explicitly avoids generated types (per STATE.md), uses manual definitions
- **Inquiry-level status:** Projects no longer use inquiry statuses (inquiry_new, ai_matching, qualified) - those are handled at inquiry level before conversion
- **delivery_date_override without delay tracking:** Now integrates with project-delays system (Phase 11)

## Open Questions

Things that couldn't be fully resolved:

1. **Cron Job Infrastructure**
   - What we know: Supabase supports pg_cron, project has edge functions
   - What's unclear: Whether pg_cron is enabled on current Supabase project, what the deployment process is for cron jobs
   - Recommendation: Check Supabase dashboard for pg_cron availability, create first cron job as part of phase implementation

2. **Retainer Dev Assignment: Array vs Junction Table**
   - What we know: Current project has single assigned_dev_id, retainer allows multiple devs
   - What's unclear: Whether to use PostgreSQL array column (retainer_dev_ids UUID[]) or junction table (retainer_assignments)
   - Recommendation: Use array for simplicity (max ~5 devs expected), matches RLS pattern with `= ANY(array)`, easier to query

3. **Future Improvements Conversion to Project**
   - What we know: Design says "Create Project from Selected" bundles multiple improvements into new inquiry
   - What's unclear: Whether this creates a new inquiry (start from scratch) or directly creates project (skip inquiry phase)
   - Recommendation: Create inquiry with improvements pre-loaded as requirements, maintains audit trail and allows proposal generation

4. **Completion Ceremony Archive Location**
   - What we know: Hill chart, testing, deliverables detail should be "archived" (hidden but recoverable)
   - What's unclear: Whether to use soft-delete flags, separate archive tables, or expanded JSON storage
   - Recommendation: Add `archived_at` timestamp to projects, use query filters to show/hide archived sections, allows full recovery if needed

5. **Check-in Health Rating Changes Notification Threshold**
   - What we know: Design says "health rating changes (e.g., green to red) notify admin always"
   - What's unclear: Should every change notify (green→yellow, yellow→green) or only downgrades (green→yellow→red)?
   - Recommendation: Notify on any change that increases risk (green→yellow, green→red, yellow→red), skip improvements (red→yellow, yellow→green) unless explicitly flagged

## Sources

### Primary (HIGH confidence)
- Codebase files:
  - `lib/api/projects.ts` - ProjectStatus type, status enum (22 values)
  - `lib/api/notifications-utils.ts` - NotificationType enum, icon/color patterns
  - `features/projects/components/ProjectTabs.tsx` - Tab system, conditional visibility
  - `features/projects/components/ProjectStatusControl.tsx` - Status transitions map, phase logic
  - `lib/api/suggestions.ts` - Lightweight task with conversation pattern
  - `lib/api/bids.ts` - Team assignment pattern (dev selection)
  - `lib/utils/projectPhases.ts` - Phase detection, status categorization
  - `supabase/migrations/20241221000001_initial_schema.sql` - Projects table schema, RLS policies
  - `supabase/migrations/20260107000001_dev_experience_foundation.sql` - Notification table, enum types
  - `app/(dashboard)/projects/page.tsx` - Projects list with Active/Archived tabs

### Secondary (MEDIUM confidence)
- Design doc: `.planning/phases/14-offboarding-retainer-system/14-DESIGN.md` (referenced in additional_context)
- STATE.md decisions: Manual type definitions, status-change notifications, lazy tab loading

### Tertiary (LOW confidence)
- None - all research based on direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in active use
- Architecture: HIGH - Multiple similar patterns exist (suggestions, bidding, status management)
- Pitfalls: MEDIUM - Based on common mistakes in similar features, not production issues in this codebase

**Research date:** 2026-02-09
**Valid until:** 30 days (2026-03-11) - Stable domain, existing patterns unlikely to change

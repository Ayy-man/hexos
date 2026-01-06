# Pulse — Personal Ops & Progress Tracking System

A personal productivity system for admin/internal users that tracks daily tasks, quarterly targets, and pulse points.

## Access

- **Admin** and **Internal** roles only
- Other roles are redirected to their dashboard

## Core Concepts

### Pulse Points

Points earned through meaningful completions:

| Action | Points | Event Type |
|--------|--------|------------|
| Complete daily task | 3 | `task_completed` |
| Complete task linked to action | 5 | `linked_task_completed` |
| Complete action | 10 | `action_completed` |
| Complete target | 25 | `target_completed` |
| Advance deliverable to done | 8 | `deliverable_advanced` |
| Complete onboarding requirement | 5 | `requirement_completed` |

### Streak

Consecutive days meeting minimum pulse threshold (default: 10 points).

**Rules:**
- Start from yesterday (today is still in progress)
- Monday–Saturday: Must meet minimum daily pulse
- Sunday: Optional — not working doesn't break streak, but working counts
- Configured per user via `pulse_settings.min_daily_pulse`

### Yearly Goal

One shared company goal per year. Visible to all admin/internal users, editable by admin only.

### Quarterly Targets

Targets belong to a quarter (Q1–Q4) and contribute to the yearly goal. Each target can have:
- Multiple owners
- Multiple actions (steps to complete)
- Progress based on completed actions

## Database Tables

All tables use `pulse_` prefix:

| Table | Purpose |
|-------|---------|
| `pulse_goals` | Yearly company goals |
| `pulse_targets` | Quarterly targets |
| `pulse_target_owners` | Target ownership (M2M) |
| `pulse_actions` | Actions for targets |
| `pulse_daily_tasks` | Personal daily tasks |
| `pulse_events` | All pulse point events |
| `pulse_settings` | User settings (min_daily_pulse) |

## File Structure

```
app/(dashboard)/pulse/
├── page.tsx                        # Server component - data fetching
└── PulsePageClient.tsx             # Client component - interactivity

features/pulse/
├── components/
│   ├── PulseHeader.tsx             # Stats: streak, today, week, avg
│   ├── Heatmap.tsx                 # 12-week contribution graph
│   ├── WeekView.tsx                # Week task view with navigation
│   ├── DayColumn.tsx               # Single day's tasks
│   ├── TaskItem.tsx                # Task with checkbox
│   ├── QuarterTargets.tsx          # Current quarter targets
│   ├── TargetCard.tsx              # Expandable target with actions
│   └── GoalHeader.tsx              # Yearly goal display
├── actions/
│   ├── taskActions.ts              # Task CRUD server actions
│   ├── targetActions.ts            # Target/action server actions
│   └── goalActions.ts              # Goal + settings server actions
└── hooks/
    └── (hooks if needed)

lib/api/
├── pulse.ts                        # Core: logPulseEvent, getPulseStats
├── pulse-tasks.ts                  # Daily task operations
├── pulse-targets.ts                # Target/action operations
└── pulse-goals.ts                  # Goal operations

lib/utils/
└── pulseCalculations.ts            # Streak calc, date utils, heatmap
```

## Key Functions

### Logging Pulse Events

```typescript
import { logPulseEvent } from '@/lib/api/pulse'

// Log when task completed
await logPulseEvent(userId, 'task_completed', 'task', taskId)

// Log when deliverable marked done
await logPulseEvent(userId, 'deliverable_advanced', 'deliverable', deliverableId)
```

### Getting Stats

```typescript
import { getPulseStats, getHeatmapData } from '@/lib/api/pulse'

const stats = await getPulseStats(userId)
// { streak, todayPoints, weekPoints, averageDaily, longestStreak }

const heatmap = await getHeatmapData(userId, 12) // 12 weeks
// { [date: string]: number } - points per day
```

### Task Rollover

Tasks roll over on page load, not via cron job:

```typescript
import { rolloverIncompleteTasks } from '@/lib/api/pulse-tasks'

// Copy incomplete tasks from yesterday to today
await rolloverIncompleteTasks(userId, yesterdayDate, todayDate)
```

## Integration Points

### Deliverable Completion

In `/features/projects/actions/deliverableActions.ts`:

```typescript
if (status === 'done' && oldStatus !== 'done') {
  await logPulseEvent(user.id, 'deliverable_advanced', 'deliverable', deliverableId)
}
```

### Requirement Completion

In `/lib/api/onboarding-requirements.ts`:

```typescript
if (isNewApproval && user?.id) {
  await logPulseEvent(user.id, 'requirement_completed', 'requirement', id)
}
```

## Sidebar Streak Badge

The sidebar shows the current streak next to "Pulse" for admin/internal users.

**Flow:**
1. `layout.tsx` fetches streak via `getStreak(userId)`
2. Passes `pulseStreak` prop to `AppSidebar`
3. Sidebar renders flame icon with count for Pulse nav item

## Migration

Run in Supabase SQL Editor:

```sql
-- File: supabase/migrations/20260108000010_pulse_system.sql
-- Creates all pulse tables with RLS policies
```

## Status Thresholds (Heatmap)

| Points | Intensity | Color |
|--------|-----------|-------|
| 0 | 0 | Gray (muted) |
| 1–9 | 1 | Cyan 25% |
| 10–24 | 2 | Cyan 60% |
| 25+ | 3 | Cyan 100% |

## RLS Policies Summary

| Table | Admin | Internal | User |
|-------|-------|----------|------|
| pulse_goals | CRUD | Read | — |
| pulse_targets | CRUD | Read | — |
| pulse_target_owners | CRUD | CRUD | — |
| pulse_actions | CRUD | Read, Update own | — |
| pulse_daily_tasks | — | — | Own only |
| pulse_events | — | — | Own only |
| pulse_settings | All users | Own only | Own only |

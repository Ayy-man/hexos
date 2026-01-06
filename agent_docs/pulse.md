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

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  Pulse                                                  │
│                                                         │
│  🔥 12 day streak        Today: 18 pts       Avg: 14   │
│                                                         │
│  [====== 12 week heatmap (cal-heatmap) ======]         │
│                                                         │
├────────────────────────┬────────────────────────────────┤
│  THIS WEEK     < >     │  2026 Goal: Hit $X revenue     │
│  ┌───┬───┬───┬───┬───┐ ├────────────────────────────────┤
│  │Mon│Tue│Wed│Thu│Fri│ │  Q1 TARGETS                    │
│  ├───┼───┼───┼───┼───┤ │                                │
│  │ ☐ │ ☐ │ ☐ │   │   │ │  ████████░░ Close 5 clients    │
│  │ ☐ │ ☑ │   │   │   │ │  ██████░░░░ Launch new offer   │
│  │ ☑ │   │   │   │   │ │                                │
│  └───┴───┴───┴───┴───┘ │  [+ Add Target]                │
│  Sat  Sun              │                                │
└────────────────────────┴────────────────────────────────┘
```

### Key UI Decisions

- **Streak is the hero** — Large 🔥 emoji with count on left, secondary stats smaller on right
- **Heatmap uses cal-heatmap** — 12 weeks, Monday start, brand cyan colors
- **Week view shows all 7 days** — CSS grid, equal columns, current day highlighted
- **Goal + Targets unified** — Single card with goal banner header above targets

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
│   ├── PulseHeader.tsx             # Streak hero + secondary stats
│   ├── Heatmap.tsx                 # cal-heatmap 12-week contribution graph
│   ├── WeekView.tsx                # 7-column week grid with navigation
│   ├── DayColumn.tsx               # Single day column (compact mode)
│   ├── TaskItem.tsx                # Task checkbox (supports compact)
│   ├── GoalAndTargets.tsx          # Unified goal banner + targets card
│   ├── TargetCard.tsx              # Expandable target with actions
│   ├── QuarterTargets.tsx          # (legacy, use GoalAndTargets)
│   └── GoalHeader.tsx              # (legacy, use GoalAndTargets)
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

lib/types/
└── pulse.ts                        # Shared types (client-safe)

lib/utils/
└── pulseCalculations.ts            # Streak calc, date utils

types/
└── cal-heatmap.d.ts                # Type declarations for cal-heatmap
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

## Heatmap Color Scale

Uses cal-heatmap with brand cyan colors:

| Points | Color | Hex |
|--------|-------|-----|
| 0 | Dark gray | `#262626` |
| 1–9 | Dark cyan | `#0d4f4f` |
| 10–24 | Mid cyan | `#0891b2` |
| 25+ | Bright cyan | `#22d3ee` |

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

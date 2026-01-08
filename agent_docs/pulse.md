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
| Complete focus task | 10 | `focus_completed` |
| Complete task linked to action | 5 + 10 | `linked_task_completed` + `action_completed` |
| Complete action | 10 | `action_completed` |
| Complete target | 25 | `target_completed` |
| Advance deliverable to done | 8 | `deliverable_advanced` |
| Complete onboarding requirement | 5 | `requirement_completed` |

**Points Reversal:** Uncompleting or deleting a task removes its associated points (deletes the `pulse_event` record).

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

4-tab navigation with URL persistence (`?tab=today|week|goals|insights`).

### Persistent Header
Always visible at top:
- Streak fire with scaling animation (more flames at higher streaks)
- Today's points
- Level system (lifetime points → level + title)

### Tab: Today
Daily productivity view:
- **Daily Score** — Circular progress ring showing % of daily goal (default 25 pts)
- **Focus Panel** — Top 3 must-do items (10 pts each), max 3
- **Task List** — Regular daily tasks (3 pts each)
- **Quick Capture** — `Cmd+K` to rapidly add tasks

### Tab: Week
Weekly overview:
- **12-week Heatmap** — Contribution graph using cal-heatmap
- **Week View** — 7-day grid with task counts per day
- **vs Last Week** — Comparison mode toggle
- **Weekly Review** — Monday prompt for reflection + setting weekly focus

### Tab: Goals
Quarterly targets and yearly goal:
- **Yearly Goal Card** — Company goal with progress bar
- **Collapsible Quarters** — Q1-Q4 sections, current quarter expanded by default
- **Target Cards** — Health scores, action tracking, forecasting

### Tab: Insights
Analytics dashboard:
- **Streak Stats** — Current, longest, avg streak length, break patterns
- **Personal Records** — Best day, week, month
- **Task Completion Chart** — Same day vs rolled vs abandoned breakdown
- **Weekly Summary** — This week vs last week comparison

### Key UI Decisions

- **Streak is the hero** — Large fire emoji with count, scales with streak length
- **Heatmap uses cal-heatmap** — 12 weeks, Monday start, brand cyan colors
- **Focus items are special** — Max 3 per day, earn 10 pts instead of 3
- **Level system** — 50 levels from Rookie (0 pts) to Godlike (150k pts)

## Database Tables

All tables use `pulse_` prefix:

| Table | Purpose |
|-------|---------|
| `pulse_goals` | Yearly company goals |
| `pulse_targets` | Quarterly targets |
| `pulse_target_owners` | Target ownership (M2M) |
| `pulse_actions` | Actions for targets |
| `pulse_daily_tasks` | Personal daily tasks (includes `is_focus`, `times_rolled` columns) |
| `pulse_events` | All pulse point events |
| `pulse_settings` | User settings (min_daily_pulse) |
| `pulse_weekly_reviews` | Monday reflection prompts |
| `pulse_quarterly_reviews` | End-of-quarter reflections |

## File Structure

```
app/(dashboard)/pulse/
├── page.tsx                        # Server component - data fetching
└── PulsePageClient.tsx             # Client component - tab routing

features/pulse/
├── components/
│   ├── PulseHeader.tsx             # Streak hero + level system
│   ├── PulseTabs.tsx               # Tab navigation with URL persistence
│   ├── Heatmap.tsx                 # cal-heatmap 12-week contribution graph
│   ├── GitHubHeatmap.tsx           # GitHub-style 365-day heatmap
│   ├── WeekView.tsx                # 7-column week grid with navigation
│   ├── DayColumn.tsx               # Single day column (compact mode)
│   ├── TaskItem.tsx                # Task checkbox (supports compact, optimistic UI)
│   ├── DailyScore.tsx              # Circular progress component
│   ├── FocusPanel.tsx              # Top 3 focus items (10 pts each, optimistic UI)
│   ├── TaskList.tsx                # Regular task list with drag-and-drop
│   ├── QuickCapture.tsx            # Cmd+K rapid task entry
│   ├── WeeklyReview.tsx            # Monday reflection prompt
│   ├── YearlyGoalCard.tsx          # Goal with progress bar
│   ├── QuarterTargets.tsx          # Quarter section with targets
│   ├── TargetCardEnhanced.tsx      # Target with health scores
│   ├── GoalAndTargets.tsx          # (legacy)
│   ├── TargetCard.tsx              # (legacy)
│   ├── tabs/
│   │   ├── TodayTab.tsx            # Today tab container
│   │   ├── WeekTab.tsx             # Week tab container
│   │   ├── GoalsTab.tsx            # Goals tab container
│   │   └── InsightsTab.tsx         # Insights tab container
│   └── insights/
│       ├── StreakStatsCard.tsx     # Streak analytics
│       ├── PersonalRecordsCard.tsx # Best day/week/month
│       ├── TaskCompletionChart.tsx # Completion breakdown
│       └── WeeklySummaryCard.tsx   # Week-over-week comparison
├── actions/
│   ├── taskActions.ts              # Task CRUD + focus tasks
│   ├── targetActions.ts            # Target/action server actions
│   ├── goalActions.ts              # Goal + settings server actions
│   ├── reviewActions.ts            # Weekly/quarterly review actions
│   └── insightsActions.ts          # Insights data fetching
└── hooks/
    └── (hooks if needed)

lib/api/
├── pulse.ts                        # Core: logPulseEvent, getPulseStats
├── pulse-tasks.ts                  # Daily + focus task operations
├── pulse-targets.ts                # Target/action operations
├── pulse-goals.ts                  # Goal operations
├── pulse-reviews.ts                # Weekly/quarterly reviews
└── pulse-insights.ts               # Insights calculations

lib/types/
└── pulse.ts                        # Shared types (includes LevelInfo, PulseInsights)

lib/utils/
└── pulseCalculations.ts            # Streak calc, level calc, date utils

types/
└── cal-heatmap.d.ts                # Type declarations for cal-heatmap
```

## Real-time Architecture

The pulse system uses Supabase Realtime for instant UI updates:

### `usePulseRealtime` Hook (`hooks/use-pulse-realtime.ts`)

Subscribes to two tables:

1. **`pulse_daily_tasks`** — For task UI state (checkboxes, titles, positions)
2. **`pulse_events`** — For points (INSERT = add points, DELETE = subtract points)

```typescript
// Points are calculated from events, NOT from task state
// This ensures client always matches server
channel
  .on('postgres_changes', { table: 'pulse_events', event: 'INSERT' }, (payload) => {
    setStats(prev => ({ ...prev, todayPoints: prev.todayPoints + payload.new.points }))
  })
  .on('postgres_changes', { table: 'pulse_events', event: 'DELETE' }, (payload) => {
    setStats(prev => ({ ...prev, todayPoints: prev.todayPoints - payload.old.points }))
  })
```

### Optimistic UI

Task components use local optimistic state to prevent race conditions on rapid clicks:

```typescript
const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null)
const isCompleted = optimisticCompleted ?? !!task.completed_at

// Block clicks while processing
if (optimisticCompleted !== null) return
```

## Key Functions

### Logging Pulse Events

```typescript
import { logPulseEvent, deletePulseEventsBySource } from '@/lib/api/pulse'

// Log when task completed
await logPulseEvent(userId, 'task_completed', 'task', taskId)

// Log when focus task completed (10 pts)
await logPulseEvent(userId, 'focus_completed', 'task', taskId)

// Log when deliverable marked done
await logPulseEvent(userId, 'deliverable_advanced', 'deliverable', deliverableId)

// Delete events when uncompleting/deleting (reverses points)
await deletePulseEventsBySource('task', taskId)
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

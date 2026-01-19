// ============================================================================
// Pulse Types - Shared between client and server code
// ============================================================================

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'
export type TargetStatus = 'not_started' | 'in_progress' | 'completed'

export interface DailyPointsMap {
  [date: string]: number
}

export interface PulseSettings {
  user_id: string
  min_daily_pulse: number
  updated_at: string
}


export interface PulseGoal {
  id: string
  year: number
  title: string
  target_value: number | null
  current_value: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateGoalInput {
  year: number
  title: string
  target_value?: number
}

export interface UpdateGoalInput {
  title?: string
  target_value?: number | null
  current_value?: number | null
}


export interface PulseTarget {
  id: string
  goal_id: string | null
  quarter: Quarter
  title: string
  status: TargetStatus
  due_date: string | null
  completed_at: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface CreateTargetInput {
  goal_id?: string
  quarter: Quarter
  title: string
  due_date?: string
  owner_ids?: string[]
}

export interface UpdateTargetInput {
  title?: string
  quarter?: Quarter
  status?: TargetStatus
  due_date?: string | null
  position?: number
}


export interface PulseAction {
  id: string
  target_id: string
  title: string
  owner_id: string | null
  due_date: string | null
  completed_at: string | null
  position: number
  created_at: string
  owner?: {
    id: string
    name: string
    email: string
  }
}

export interface CreateActionInput {
  target_id: string
  title: string
  owner_id?: string
  due_date?: string
}

export interface UpdateActionInput {
  title?: string
  owner_id?: string | null
  due_date?: string | null
  position?: number
}


export interface PulseTargetWithOwners extends PulseTarget {
  owners: Array<{
    id: string
    name: string
    email: string
  }>
  actions: PulseAction[]
}

export interface PulseDailyTask {
  id: string
  user_id: string
  date: string
  title: string
  completed_at: string | null
  rolled_from: string | null
  linked_action_id: string | null
  position: number
  created_at: string
  is_focus: boolean
  times_rolled: number
  time_logged_minutes: number
  time_required: boolean
}

export interface CreateTaskInput {
  date: string
  title: string
  linked_action_id?: string
  position?: number
}

export interface UpdateTaskInput {
  title?: string
  date?: string
  linked_action_id?: string | null
  position?: number
}


export type PulseEventType =
  | 'task_completed'
  | 'focus_completed'
  | 'linked_task_completed'
  | 'action_completed'
  | 'target_completed'
  | 'deliverable_advanced'
  | 'requirement_completed'

export const PULSE_POINTS: Record<PulseEventType, number> = {
  task_completed: 3,
  focus_completed: 10,
  linked_task_completed: 5,
  action_completed: 10,
  target_completed: 25,
  deliverable_advanced: 8,
  requirement_completed: 5,
}

export type PulseSourceType =
  | 'task'
  | 'action'
  | 'target'
  | 'deliverable'
  | 'requirement'

export interface PulseEvent {
  id: string
  user_id: string
  event_type: PulseEventType
  points: number
  source_type: PulseSourceType
  source_id: string | null
  created_at: string
}

export interface PulseStats {
  streak: number
  todayPoints: number
  weekPoints: number
  averageDaily: number
  longestStreak: number
}

// ============================================================================
// Weekly Reviews
// ============================================================================

export interface PulseWeeklyReview {
  id: string
  user_id: string
  week_start: string
  tasks_completed: number | null
  points_earned: number | null
  streak_length: number | null
  focus_text: string | null
  dismissed_at: string | null
  created_at: string
}

export interface CreateWeeklyReviewInput {
  week_start: string
  tasks_completed?: number
  points_earned?: number
  streak_length?: number
  focus_text?: string
}

// ============================================================================
// Quarterly Reviews
// ============================================================================

export interface PulseQuarterlyReview {
  id: string
  user_id: string
  year: number
  quarter: number
  targets_completed: number | null
  targets_total: number | null
  worked_text: string | null
  didnt_work_text: string | null
  carry_forward_text: string | null
  created_at: string
}

// ============================================================================
// Level System
// ============================================================================

export interface LevelInfo {
  level: number
  title: string
  currentPoints: number
  pointsForNextLevel: number
  progress: number // 0-100 percentage to next level
}

export const LEVEL_THRESHOLDS: Array<{ level: number; points: number; title: string }> = [
  { level: 1, points: 0, title: 'Rookie' },
  { level: 2, points: 100, title: 'Beginner' },
  { level: 3, points: 250, title: 'Apprentice' },
  { level: 4, points: 500, title: 'Journeyman' },
  { level: 5, points: 1000, title: 'Operator' },
  { level: 6, points: 1750, title: 'Professional' },
  { level: 7, points: 2750, title: 'Expert' },
  { level: 8, points: 4000, title: 'Master' },
  { level: 9, points: 5500, title: 'Elite' },
  { level: 10, points: 7500, title: 'Champion' },
  { level: 15, points: 15000, title: 'Veteran' },
  { level: 20, points: 25000, title: 'Legend' },
  { level: 25, points: 40000, title: 'Mythic' },
  { level: 30, points: 60000, title: 'Immortal' },
  { level: 40, points: 100000, title: 'Transcendent' },
  { level: 50, points: 150000, title: 'Godlike' },
]

// ============================================================================
// Extended Stats for Insights
// ============================================================================

export interface PulseInsights {
  // Streak stats
  currentStreak: number
  longestStreak: number
  streaksThisYear: number
  averageStreakLength: number
  streakBreaks: number
  mostCommonBreakDay: string | null

  // Personal records
  bestDay: { points: number; date: string } | null
  bestWeek: { points: number; startDate: string } | null
  bestMonth: { points: number; month: string } | null

  // Task completion breakdown
  sameDay: number      // % completed same day
  nextDay: number      // % completed next day
  rolledMultiple: number // % rolled 2+ days
  abandoned: number    // % deleted without completing
  avgTimesRolled: number

  // This week summary
  weekPoints: number
  weekPointsDelta: number // vs last week
  weekTasks: number
  weekTasksDelta: number
  focusHitRate: number // % of focus items completed
  topProject: string | null
}

// ============================================================================
// Tab Navigation
// ============================================================================

export type PulseTab = 'today' | 'week' | 'goals' | 'insights'

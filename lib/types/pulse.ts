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
  | 'linked_task_completed'
  | 'action_completed'
  | 'target_completed'
  | 'deliverable_advanced'
  | 'requirement_completed'

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

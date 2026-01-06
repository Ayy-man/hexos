import { createClient } from '@/lib/supabase/server'
import type { PulseGoal, CreateGoalInput, UpdateGoalInput } from '@/lib/types/pulse'

// ============================================================================
// CRUD Operations
// ============================================================================

export async function getGoalByYear(year: number): Promise<PulseGoal | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_goals')
    .select('*')
    .eq('year', year)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[Pulse Goals] Failed to fetch goal:', error)
    return null
  }

  return data as PulseGoal | null
}

export async function getCurrentYearGoal(): Promise<PulseGoal | null> {
  const currentYear = new Date().getFullYear()
  return getGoalByYear(currentYear)
}

export async function createGoal(
  input: CreateGoalInput,
  createdBy: string
): Promise<PulseGoal | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_goals')
    .insert({
      year: input.year,
      title: input.title,
      target_value: input.target_value || null,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) {
    console.error('[Pulse Goals] Failed to create goal:', error)
    return null
  }

  return data as PulseGoal
}

export async function updateGoal(
  goalId: string,
  input: UpdateGoalInput
): Promise<PulseGoal | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_goals')
    .update(input)
    .eq('id', goalId)
    .select()
    .single()

  if (error) {
    console.error('[Pulse Goals] Failed to update goal:', error)
    return null
  }

  return data as PulseGoal
}

export async function deleteGoal(goalId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pulse_goals')
    .delete()
    .eq('id', goalId)

  if (error) {
    console.error('[Pulse Goals] Failed to delete goal:', error)
    return false
  }

  return true
}

// ============================================================================
// Progress Calculation
// ============================================================================

export function calculateGoalProgress(goal: PulseGoal): number {
  if (!goal.target_value || goal.target_value === 0) return 0
  if (!goal.current_value) return 0

  const progress = Math.round((goal.current_value / goal.target_value) * 100)
  return Math.min(progress, 100) // Cap at 100%
}

// ============================================================================
// All Goals (for admin views)
// ============================================================================

export async function getAllGoals(): Promise<PulseGoal[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_goals')
    .select('*')
    .order('year', { ascending: false })

  if (error) {
    console.error('[Pulse Goals] Failed to fetch all goals:', error)
    return []
  }

  return data as PulseGoal[]
}

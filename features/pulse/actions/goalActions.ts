'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createGoal,
  updateGoal,
  deleteGoal,
  type CreateGoalInput,
  type UpdateGoalInput,
  type PulseGoal,
} from '@/lib/api/pulse-goals'
import { updatePulseSettings, type PulseSettings } from '@/lib/api/pulse'

// ============================================================================
// Goal CRUD Actions
// ============================================================================

export async function createGoalAction(
  input: CreateGoalInput
): Promise<{ success: boolean; goal?: PulseGoal; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const goal = await createGoal(input, user.id)

    if (!goal) {
      return { success: false, error: 'Failed to create goal' }
    }

    revalidatePath('/pulse')
    return { success: true, goal }
  } catch (error) {
    console.error('[Pulse Goal Action] Create error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function updateGoalAction(
  goalId: string,
  input: UpdateGoalInput
): Promise<{ success: boolean; goal?: PulseGoal; error?: string }> {
  try {
    const goal = await updateGoal(goalId, input)

    if (!goal) {
      return { success: false, error: 'Failed to update goal' }
    }

    revalidatePath('/pulse')
    return { success: true, goal }
  } catch (error) {
    console.error('[Pulse Goal Action] Update error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function deleteGoalAction(
  goalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteGoal(goalId)

    if (!success) {
      return { success: false, error: 'Failed to delete goal' }
    }

    revalidatePath('/pulse')
    return { success: true }
  } catch (error) {
    console.error('[Pulse Goal Action] Delete error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

// ============================================================================
// Settings Actions
// ============================================================================

export async function updateMinDailyPulseAction(
  userId: string,
  minDailyPulse: number
): Promise<{ success: boolean; settings?: PulseSettings; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if user is admin to update other users' settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Only admin can update other users' settings
    if (userId !== user.id && profile?.role !== 'admin') {
      return { success: false, error: 'Not authorized' }
    }

    const settings = await updatePulseSettings(userId, minDailyPulse)

    if (!settings) {
      return { success: false, error: 'Failed to update settings' }
    }

    revalidatePath('/pulse')
    return { success: true, settings }
  } catch (error) {
    console.error('[Pulse Settings Action] Update error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

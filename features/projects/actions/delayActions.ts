'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createDelay,
  updateDelay,
  deleteDelay,
  getDelaySummary,
  type CreateDelayInput,
  type DelaySummary,
} from '@/lib/api/project-delays'

// ============================================
// Delay Tracking Actions
// ============================================

/**
 * Mark a delay on a project
 */
export async function createDelayAction(
  input: CreateDelayInput
): Promise<{ success: boolean; delayId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const delay = await createDelay(input)

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: input.project_id,
      user_id: user.id,
      action: 'delay_marked',
      details: {
        delay_id: delay.id,
        delay_type: input.delay_type,
        delay_date: input.delay_date,
        days_count: input.days_count || 1,
        reason: input.reason,
        deliverable_id: input.deliverable_id,
        blocker_id: input.blocker_id,
      },
    })

    revalidatePath(`/projects/${input.project_id}`)
    return { success: true, delayId: delay.id }
  } catch (error) {
    console.error('Failed to create delay:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark delay',
    }
  }
}

/**
 * Update a delay
 */
export async function updateDelayAction(
  delayId: string,
  projectId: string,
  updates: { delay_date?: string; days_count?: number; reason?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDelay(delayId, updates)
    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to update delay:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update delay',
    }
  }
}

/**
 * Delete a delay
 */
export async function deleteDelayAction(
  delayId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get delay info for logging
    const { data: delay } = await supabase
      .from('project_delays')
      .select('delay_type, delay_date, reason')
      .eq('id', delayId)
      .single()

    await deleteDelay(delayId)

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'delay_removed',
      details: {
        delay_id: delayId,
        delay_type: delay?.delay_type,
        delay_date: delay?.delay_date,
        reason: delay?.reason,
      },
    })

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to delete delay:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete delay',
    }
  }
}

/**
 * Get delay summary for a project (client-safe action)
 */
export async function getDelaySummaryAction(
  projectId: string
): Promise<DelaySummary> {
  try {
    return await getDelaySummary(projectId)
  } catch (error) {
    console.error('Failed to get delay summary:', error)
    return {
      client_delay_days: 0,
      dev_delay_days: 0,
      total_delay_days: 0,
    }
  }
}

/**
 * Mark client delay from a blocker
 */
export async function markBlockerDelayAction(
  projectId: string,
  blockerId: string,
  reason: string,
  daysCount: number = 1
): Promise<{ success: boolean; delayId?: string; error?: string }> {
  try {
    const today = new Date().toISOString().split('T')[0]

    const result = await createDelayAction({
      project_id: projectId,
      delay_type: 'client_delay',
      delay_date: today,
      days_count: daysCount,
      blocker_id: blockerId,
      reason,
    })

    return result
  } catch (error) {
    console.error('Failed to mark blocker delay:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark delay',
    }
  }
}

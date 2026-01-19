'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureTestSessionForDeliverable } from '@/lib/api/testing'

// ============================================
// Hill Chart Position Actions
// ============================================

/**
 * Update a deliverable's hill chart position and log to history
 * Only creates one history entry per day - subsequent updates on the same day update the existing entry
 */
export async function updatePositionAction(
  deliverableId: string,
  projectId: string,
  position: number,
  note?: string
): Promise<void> {
  console.log('[updatePositionAction] Starting:', { deliverableId, projectId, position })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('[updatePositionAction] User:', user?.id || 'NO USER')

  if (!user) throw new Error('Not authenticated')

  // Clamp position to 0-100
  const clampedPosition = Math.max(0, Math.min(100, Math.round(position)))

  // Get current position for activity logging
  const { data: current } = await supabase
    .from('deliverables')
    .select('hill_position, title')
    .eq('id', deliverableId)
    .single()

  // Update the deliverable's position
  const { error: updateError, data: updateData } = await supabase
    .from('deliverables')
    .update({ hill_position: clampedPosition })
    .eq('id', deliverableId)
    .select()

  console.log('[updatePositionAction] Update result:', { error: updateError, data: updateData, rowsAffected: updateData?.length || 0 })

  if (updateError) {
    console.error('[updatePositionAction] Update failed:', updateError)
    throw updateError
  }

  // Check if update actually affected a row (RLS might silently block updates)
  if (!updateData || updateData.length === 0) {
    console.error('[updatePositionAction] No rows updated - likely RLS policy blocking write access')
    throw new Error('Failed to update position - no write access to this deliverable')
  }

  // Auto-create test session when entering the testing zone (90%+)
  // This ensures deliverables appear in the Testing tab immediately
  if (clampedPosition >= 90) {
    try {
      await ensureTestSessionForDeliverable(deliverableId)
    } catch (error) {
      // Log error but don't fail the position update
      console.error('[updatePositionAction] Failed to ensure test session:', error)
    }
  }

  // Check if there's already a history entry for today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: existingEntry } = await supabase
    .from('deliverable_position_history')
    .select('id')
    .eq('deliverable_id', deliverableId)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existingEntry) {
    // Update existing entry for today
    const { error: historyError } = await supabase
      .from('deliverable_position_history')
      .update({
        position: clampedPosition,
        note: note || null,
      })
      .eq('id', existingEntry.id)

    if (historyError) throw historyError
  } else {
    // Create new entry for today
    const { error: historyError } = await supabase
      .from('deliverable_position_history')
      .insert({
        deliverable_id: deliverableId,
        position: clampedPosition,
        note: note || null,
        created_by: user.id,
      })

    if (historyError) throw historyError
  }

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'hill_position_updated',
    details: {
      deliverable_id: deliverableId,
      title: current?.title,
      old_position: current?.hill_position ?? 0,
      new_position: clampedPosition,
      note: note || null,
    },
  })

  console.log('[updatePositionAction] SUCCESS - Position updated to', clampedPosition)

  revalidatePath(`/projects/${projectId}`)
}

/**
 * Quick update action with delta (for -5%, +5%, +10% buttons)
 * Only creates one history entry per day - subsequent updates on the same day update the existing entry
 */
export async function quickUpdatePositionAction(
  deliverableId: string,
  projectId: string,
  delta: number
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get current position
  const { data: current, error: fetchError } = await supabase
    .from('deliverables')
    .select('hill_position, title')
    .eq('id', deliverableId)
    .single()

  if (fetchError) throw fetchError

  const currentPosition = current?.hill_position ?? 0
  const newPosition = Math.max(0, Math.min(100, currentPosition + delta))

  // Update the deliverable's position
  const { error: updateError } = await supabase
    .from('deliverables')
    .update({ hill_position: newPosition })
    .eq('id', deliverableId)

  if (updateError) throw updateError

  // Auto-create test session when entering the testing zone (90%+)
  if (newPosition >= 90) {
    try {
      await ensureTestSessionForDeliverable(deliverableId)
    } catch (error) {
      // Log error but don't fail the position update
      console.error('[quickUpdatePositionAction] Failed to ensure test session:', error)
    }
  }

  // Check if there's already a history entry for today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: existingEntry } = await supabase
    .from('deliverable_position_history')
    .select('id')
    .eq('deliverable_id', deliverableId)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const note = `Quick update: ${delta >= 0 ? '+' : ''}${delta}%`

  if (existingEntry) {
    // Update existing entry for today
    const { error: historyError } = await supabase
      .from('deliverable_position_history')
      .update({
        position: newPosition,
        note,
      })
      .eq('id', existingEntry.id)

    if (historyError) throw historyError
  } else {
    // Create new entry for today
    const { error: historyError } = await supabase
      .from('deliverable_position_history')
      .insert({
        deliverable_id: deliverableId,
        position: newPosition,
        note,
        created_by: user.id,
      })

    if (historyError) throw historyError
  }

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'hill_position_updated',
    details: {
      deliverable_id: deliverableId,
      title: current?.title,
      old_position: currentPosition,
      new_position: newPosition,
      delta,
      quick_update: true,
    },
  })

  revalidatePath(`/projects/${projectId}`)
}

/**
 * Batch update positions (for drag-and-drop with multiple items)
 * Only creates one history entry per day per deliverable - subsequent updates on the same day update the existing entry
 */
export async function batchUpdatePositionsAction(
  projectId: string,
  updates: Array<{ id: string; position: number }>
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Process each update
  const promises = updates.map(async ({ id, position }) => {
    const clampedPosition = Math.max(0, Math.min(100, Math.round(position)))

    // Update deliverable
    await supabase
      .from('deliverables')
      .update({ hill_position: clampedPosition })
      .eq('id', id)

    // Check if there's already a history entry for today
    const { data: existingEntry } = await supabase
      .from('deliverable_position_history')
      .select('id')
      .eq('deliverable_id', id)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingEntry) {
      // Update existing entry for today
      await supabase
        .from('deliverable_position_history')
        .update({
          position: clampedPosition,
          note: 'Batch update',
        })
        .eq('id', existingEntry.id)
    } else {
      // Create new entry for today
      await supabase.from('deliverable_position_history').insert({
        deliverable_id: id,
        position: clampedPosition,
        note: 'Batch update',
        created_by: user.id,
      })
    }

    // Auto-create test session when entering the testing zone (90%+)
    if (clampedPosition >= 90) {
      try {
        await ensureTestSessionForDeliverable(id)
      } catch (error) {
        // Log error but don't fail the batch update
        console.error('[batchUpdatePositionsAction] Failed to ensure test session:', error)
      }
    }
  })

  await Promise.all(promises)

  // Log activity for batch
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'hill_positions_batch_updated',
    details: {
      count: updates.length,
      updates: updates.map((u) => ({
        id: u.id,
        position: Math.max(0, Math.min(100, Math.round(u.position))),
      })),
    },
  })

  revalidatePath(`/projects/${projectId}`)
}

/**
 * Set custom color for a deliverable on the hill chart
 */
export async function setDeliverableColorAction(
  deliverableId: string,
  projectId: string,
  color: string
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('deliverables')
    .update({ hill_color: color })
    .eq('id', deliverableId)

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
}

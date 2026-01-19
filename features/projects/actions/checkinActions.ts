'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createCheckin,
  updateCheckin,
  updateCheckinNote,
  snoozeCheckinReminder,
  clearCheckinSnooze,
  type CreateCheckinInput,
} from '@/lib/api/dev-logging'

// ============================================
// Check-in Actions
// ============================================

/**
 * Submit a new check-in
 */
export async function submitCheckinAction(
  input: CreateCheckinInput
): Promise<{ success: boolean; checkinId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const checkin = await createCheckin(input)

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: input.project_id,
      user_id: user.id,
      action: 'dev_checkin_submitted',
      details: {
        checkin_id: checkin.id,
        checkin_type: input.checkin_type,
        checkin_date: input.checkin_date,
        notes_count: input.notes?.length || 0,
      },
    })

    revalidatePath(`/projects/${input.project_id}`)
    revalidatePath('/dashboard')

    return { success: true, checkinId: checkin.id }
  } catch (error) {
    console.error('Failed to submit check-in:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit check-in',
    }
  }
}

/**
 * Update an existing check-in (if not locked)
 */
export async function updateCheckinAction(
  checkinId: string,
  projectId: string,
  updates: { checkin_type?: 'progress' | 'no_work' | 'delay'; summary?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateCheckin(checkinId, updates)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to update check-in:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update check-in',
    }
  }
}

/**
 * Update a check-in note
 */
export async function updateCheckinNoteAction(
  noteId: string,
  projectId: string,
  updates: { note?: string; position_after?: number; position_delta?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    await updateCheckinNote(noteId, updates)

    // If position was updated, also update the deliverable
    if (updates.position_after !== undefined) {
      // Get the note to find the deliverable
      const { data: note } = await supabase
        .from('checkin_notes')
        .select('deliverable_id, checkin_id')
        .eq('id', noteId)
        .single()

      if (note) {
        // Update deliverable position
        await supabase
          .from('deliverables')
          .update({ hill_position: updates.position_after })
          .eq('id', note.deliverable_id)

        // Log to position history
        await supabase.from('deliverable_position_history').insert({
          deliverable_id: note.deliverable_id,
          position: updates.position_after,
          note: updates.note || 'Updated via check-in',
          created_by: user.id,
          checkin_id: note.checkin_id,
        })
      }
    }

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to update check-in note:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update note',
    }
  }
}

/**
 * Snooze check-in reminder
 */
export async function snoozeCheckinAction(
  hours: number = 24
): Promise<{ success: boolean; error?: string }> {
  try {
    await snoozeCheckinReminder(hours)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Failed to snooze check-in:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to snooze',
    }
  }
}

/**
 * Clear snooze
 */
export async function clearSnoozeAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await clearCheckinSnooze()
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Failed to clear snooze:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear snooze',
    }
  }
}

/**
 * Quick position update from check-in modal
 */
export async function quickPositionUpdateAction(
  deliverableId: string,
  projectId: string,
  delta: number,
  checkinId?: string
): Promise<{ success: boolean; newPosition?: number; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get current position
    const { data: current } = await supabase
      .from('deliverables')
      .select('hill_position, title')
      .eq('id', deliverableId)
      .single()

    const currentPosition = current?.hill_position ?? 0
    const newPosition = Math.max(0, Math.min(100, currentPosition + delta))

    // Update deliverable
    await supabase
      .from('deliverables')
      .update({ hill_position: newPosition })
      .eq('id', deliverableId)

    // Log to history
    await supabase.from('deliverable_position_history').insert({
      deliverable_id: deliverableId,
      position: newPosition,
      note: `Quick update: ${delta >= 0 ? '+' : ''}${delta}%`,
      created_by: user.id,
      checkin_id: checkinId || null,
    })

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
        from_checkin: !!checkinId,
      },
    })

    revalidatePath(`/projects/${projectId}`)
    return { success: true, newPosition }
  } catch (error) {
    console.error('Failed to update position:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update position',
    }
  }
}

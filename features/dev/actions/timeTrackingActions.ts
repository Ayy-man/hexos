'use server'

import { revalidatePath } from 'next/cache'
import {
  startTimer,
  stopTimer,
  addManualTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from '@/lib/api/time-tracking'

export async function startTimerAction(deliverableId: string) {
  try {
    const timer = await startTimer(deliverableId)
    revalidatePath('/dashboard/dev')
    return { success: true, timer }
  } catch (error) {
    console.error('Error starting timer:', error)
    return { success: false, message: 'Failed to start timer' }
  }
}

export async function stopTimerAction() {
  try {
    const entry = await stopTimer()
    revalidatePath('/dashboard/dev')
    return { success: true, entry }
  } catch (error) {
    console.error('Error stopping timer:', error)
    return { success: false, message: 'Failed to stop timer' }
  }
}

export async function addManualEntryAction(params: {
  deliverableId: string
  durationMinutes: number
  description?: string
  date?: string
}) {
  try {
    const entry = await addManualTimeEntry(params)
    revalidatePath('/dashboard/dev')
    return { success: true, entry }
  } catch (error) {
    console.error('Error adding time entry:', error)
    return { success: false, message: 'Failed to add time entry' }
  }
}

export async function updateTimeEntryAction(
  entryId: string,
  updates: { duration_minutes?: number; description?: string; entry_date?: string }
) {
  try {
    const entry = await updateTimeEntry(entryId, updates)
    revalidatePath('/dashboard/dev')
    return { success: true, entry }
  } catch (error) {
    console.error('Error updating time entry:', error)
    return { success: false, message: 'Failed to update time entry' }
  }
}

export async function deleteTimeEntryAction(entryId: string) {
  try {
    await deleteTimeEntry(entryId)
    revalidatePath('/dashboard/dev')
    return { success: true }
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return { success: false, message: 'Failed to delete time entry' }
  }
}

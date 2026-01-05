'use server'

import { revalidatePath } from 'next/cache'
import {
  reorderTasks,
  setWorkingOn,
  toggleStarred,
  addToQueue,
  removeFromQueue,
} from '@/lib/api/dev-task-queue'

export async function reorderTasksAction(updates: { id: string; position: number }[]) {
  try {
    await reorderTasks(updates)
    revalidatePath('/dashboard/dev')
    return { success: true }
  } catch (error) {
    console.error('Error reordering tasks:', error)
    return { success: false, message: 'Failed to reorder tasks' }
  }
}

export async function setWorkingOnAction(deliverableId: string, isWorkingOn: boolean) {
  try {
    const item = await setWorkingOn(deliverableId, isWorkingOn)
    revalidatePath('/dashboard/dev')
    return { success: true, item }
  } catch (error) {
    console.error('Error setting working on:', error)
    return { success: false, message: 'Failed to update task' }
  }
}

export async function toggleStarredAction(deliverableId: string) {
  try {
    const item = await toggleStarred(deliverableId)
    revalidatePath('/dashboard/dev')
    return { success: true, item }
  } catch (error) {
    console.error('Error toggling starred:', error)
    return { success: false, message: 'Failed to update task' }
  }
}

export async function addToQueueAction(deliverableId: string) {
  try {
    const item = await addToQueue(deliverableId)
    revalidatePath('/dashboard/dev')
    return { success: true, item }
  } catch (error) {
    console.error('Error adding to queue:', error)
    return { success: false, message: 'Failed to add task to queue' }
  }
}

export async function removeFromQueueAction(deliverableId: string) {
  try {
    await removeFromQueue(deliverableId)
    revalidatePath('/dashboard/dev')
    return { success: true }
  } catch (error) {
    console.error('Error removing from queue:', error)
    return { success: false, message: 'Failed to remove task from queue' }
  }
}

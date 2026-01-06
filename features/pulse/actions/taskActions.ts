'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  uncompleteTask,
  rolloverIncompleteTasks,
  reorderTasks,
  moveTaskToDate,
} from '@/lib/api/pulse-tasks'
import type { CreateTaskInput, UpdateTaskInput, PulseDailyTask } from '@/lib/types/pulse'

// ============================================================================
// Task CRUD Actions
// ============================================================================

export async function createTaskAction(
  input: CreateTaskInput
): Promise<{ success: boolean; task?: PulseDailyTask; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const task = await createTask(user.id, input)

    if (!task) {
      return { success: false, error: 'Failed to create task' }
    }

    revalidatePath('/pulse')
    return { success: true, task }
  } catch (error) {
    console.error('[Pulse Task Action] Create error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function updateTaskAction(
  taskId: string,
  input: UpdateTaskInput
): Promise<{ success: boolean; task?: PulseDailyTask; error?: string }> {
  try {
    const task = await updateTask(taskId, input)

    if (!task) {
      return { success: false, error: 'Failed to update task' }
    }

    revalidatePath('/pulse')
    return { success: true, task }
  } catch (error) {
    console.error('[Pulse Task Action] Update error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function deleteTaskAction(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteTask(taskId)

    if (!success) {
      return { success: false, error: 'Failed to delete task' }
    }

    revalidatePath('/pulse')
    return { success: true }
  } catch (error) {
    console.error('[Pulse Task Action] Delete error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

// ============================================================================
// Task Completion Actions
// ============================================================================

export async function completeTaskAction(
  taskId: string
): Promise<{ success: boolean; task?: PulseDailyTask; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const task = await completeTask(taskId, user.id)

    if (!task) {
      return { success: false, error: 'Failed to complete task' }
    }

    revalidatePath('/pulse')
    return { success: true, task }
  } catch (error) {
    console.error('[Pulse Task Action] Complete error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function uncompleteTaskAction(
  taskId: string
): Promise<{ success: boolean; task?: PulseDailyTask; error?: string }> {
  try {
    const task = await uncompleteTask(taskId)

    if (!task) {
      return { success: false, error: 'Failed to uncomplete task' }
    }

    revalidatePath('/pulse')
    return { success: true, task }
  } catch (error) {
    console.error('[Pulse Task Action] Uncomplete error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

// ============================================================================
// Task Rollover Actions
// ============================================================================

export async function rolloverTasksAction(
  fromDate: string,
  toDate: string
): Promise<{ success: boolean; tasks?: PulseDailyTask[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const tasks = await rolloverIncompleteTasks(user.id, fromDate, toDate)

    revalidatePath('/pulse')
    return { success: true, tasks }
  } catch (error) {
    console.error('[Pulse Task Action] Rollover error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

// ============================================================================
// Task Reorder Actions
// ============================================================================

export async function reorderTasksAction(
  date: string,
  taskIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const success = await reorderTasks(user.id, date, taskIds)

    if (!success) {
      return { success: false, error: 'Failed to reorder tasks' }
    }

    revalidatePath('/pulse')
    return { success: true }
  } catch (error) {
    console.error('[Pulse Task Action] Reorder error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function moveTaskToDateAction(
  taskId: string,
  newDate: string
): Promise<{ success: boolean; task?: PulseDailyTask; error?: string }> {
  try {
    const task = await moveTaskToDate(taskId, newDate)

    if (!task) {
      return { success: false, error: 'Failed to move task' }
    }

    revalidatePath('/pulse')
    return { success: true, task }
  } catch (error) {
    console.error('[Pulse Task Action] Move error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

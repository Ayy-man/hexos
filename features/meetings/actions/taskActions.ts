'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createMeetingTask,
  updateMeetingTask,
  deleteMeetingTask,
  convertTaskToDeliverable,
} from '@/lib/api/meeting-tasks'
import type { CreateMeetingTaskInput, UpdateMeetingTaskInput } from '@/lib/types/meetings'

/**
 * Create a new meeting task
 */
export async function createTaskAction(
  input: CreateMeetingTaskInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const result = await createMeetingTask(input, user.id)

  if (result.success) {
    revalidatePath('/meetings')
    if (input.meeting_id) {
      revalidatePath(`/meetings/${input.meeting_id}`)
    }
    if (input.project_id) {
      revalidatePath(`/projects/${input.project_id}`)
    }
  }

  return result
}

/**
 * Update a meeting task
 */
export async function updateTaskAction(
  id: string,
  input: UpdateMeetingTaskInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const result = await updateMeetingTask(id, input)

  if (result.success) {
    revalidatePath('/meetings')
  }

  return result
}

/**
 * Delete a meeting task
 */
export async function deleteTaskAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const result = await deleteMeetingTask(id)

  if (result.success) {
    revalidatePath('/meetings')
  }

  return result
}

/**
 * Convert a meeting task to a project deliverable
 */
export async function convertToDeliverableAction(
  taskId: string,
  projectId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const result = await convertTaskToDeliverable(taskId, projectId)

  if (result.success) {
    revalidatePath('/meetings')
    revalidatePath(`/projects/${projectId}`)
  }

  return result
}

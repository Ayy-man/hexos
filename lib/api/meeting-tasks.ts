/**
 * Meeting Tasks API
 * CRUD operations for meeting tasks with CSV import/export and task-to-deliverable conversion
 */

import { createClient } from '@/lib/supabase/admin'
import type {
  MeetingTask,
  CreateMeetingTaskInput,
  UpdateMeetingTaskInput,
  MeetingTaskStatus,
  MeetingTaskPriority,
  MeetingTaskSource,
} from '@/lib/types/meetings'

// Extended type for list queries with meeting title
export interface MeetingTaskWithMeetingTitle extends MeetingTask {
  meeting_title?: string
}

// ============================================================================
// MEETING TASK CRUD
// ============================================================================

/**
 * Get all meeting tasks with optional filters
 */
export async function getMeetingTasks(filters?: {
  meeting_id?: string
  project_id?: string
  inquiry_id?: string
  status?: MeetingTaskStatus
  assigned_to?: string // profile uuid
  due_before?: string // date string
  source?: MeetingTaskSource
  limit?: number
}): Promise<MeetingTaskWithMeetingTitle[]> {
  const supabase = createClient()

  let query = supabase
    .from('meeting_tasks')
    .select(
      `
      *,
      meetings!meeting_id(title)
    `
    )
    .order('created_at', { ascending: false })

  if (filters?.meeting_id) {
    query = query.eq('meeting_id', filters.meeting_id)
  }
  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id)
  }
  if (filters?.inquiry_id) {
    query = query.eq('inquiry_id', filters.inquiry_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.assigned_to) {
    query = query.eq('assigned_to_profile', filters.assigned_to)
  }
  if (filters?.due_before) {
    query = query.lte('due_date', filters.due_before)
  }
  if (filters?.source) {
    query = query.eq('source', filters.source)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching meeting tasks:', error)
    return []
  }

  return (data || []).map((task: any) => ({
    ...task,
    meeting_title: task.meetings?.title || null,
    meetings: undefined,
  }))
}

/**
 * Get a single meeting task by ID
 */
export async function getMeetingTask(id: string): Promise<MeetingTask | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('meeting_tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching meeting task:', error)
    return null
  }

  return data as MeetingTask
}

/**
 * Create a new meeting task
 */
export async function createMeetingTask(
  input: CreateMeetingTaskInput,
  userId: string
): Promise<{ success: boolean; data?: MeetingTask; error?: string }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('meeting_tasks')
    .insert({
      title: input.title,
      description: input.description || null,
      assigned_to_name: input.assigned_to_name || null,
      assigned_to_profile: input.assigned_to_profile || null,
      due_date: input.due_date || null,
      priority: input.priority || 'normal',
      status: 'pending',
      meeting_id: input.meeting_id || null,
      project_id: input.project_id || null,
      inquiry_id: input.inquiry_id || null,
      source: 'manual',
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating meeting task:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data as MeetingTask }
}

/**
 * Update a meeting task
 */
export async function updateMeetingTask(
  id: string,
  input: UpdateMeetingTaskInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Build update object
  const updates: any = {
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) updates.title = input.title
  if (input.description !== undefined) updates.description = input.description
  if (input.assigned_to_name !== undefined)
    updates.assigned_to_name = input.assigned_to_name
  if (input.assigned_to_profile !== undefined)
    updates.assigned_to_profile = input.assigned_to_profile
  if (input.due_date !== undefined) updates.due_date = input.due_date
  if (input.priority !== undefined) updates.priority = input.priority
  if (input.project_id !== undefined) updates.project_id = input.project_id
  if (input.inquiry_id !== undefined) updates.inquiry_id = input.inquiry_id
  if (input.deliverable_id !== undefined)
    updates.deliverable_id = input.deliverable_id

  // Handle status changes with completed_at logic
  if (input.status !== undefined) {
    updates.status = input.status

    // Get current status to compare
    const { data: current } = await supabase
      .from('meeting_tasks')
      .select('status')
      .eq('id', id)
      .single()

    if (current) {
      const currentStatus = current.status as MeetingTaskStatus
      const newStatus = input.status

      // Set completed_at when status changes to 'done'
      if (newStatus === 'done' && currentStatus !== 'done') {
        updates.completed_at = new Date().toISOString()
      }

      // Clear completed_at when status changes from 'done'
      if (currentStatus === 'done' && newStatus !== 'done') {
        updates.completed_at = null
      }
    }
  }

  const { error } = await supabase.from('meeting_tasks').update(updates).eq('id', id)

  if (error) {
    console.error('Error updating meeting task:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Delete a meeting task
 */
export async function deleteMeetingTask(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase.from('meeting_tasks').delete().eq('id', id)

  if (error) {
    console.error('Error deleting meeting task:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Convert meeting task to project deliverable
 */
export async function convertTaskToDeliverable(
  taskId: string,
  projectId: string
): Promise<{
  success: boolean
  data?: { deliverable_id: string; task_id: string }
  error?: string
}> {
  const supabase = createClient()

  // Get the task
  const task = await getMeetingTask(taskId)
  if (!task) {
    return { success: false, error: 'Task not found' }
  }

  // Create deliverable
  const { data: deliverable, error: deliverableError } = await supabase
    .from('deliverables')
    .insert({
      project_id: projectId,
      title: task.title,
      description: task.description || null,
      status: 'pending',
      due_date: task.due_date || null,
    })
    .select()
    .single()

  if (deliverableError) {
    console.error('Error creating deliverable:', deliverableError)
    return { success: false, error: deliverableError.message }
  }

  // Update task with deliverable_id and project_id
  const { error: updateError } = await supabase
    .from('meeting_tasks')
    .update({
      deliverable_id: deliverable.id,
      project_id: projectId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (updateError) {
    console.error('Error linking task to deliverable:', updateError)
    // Rollback deliverable creation
    await supabase.from('deliverables').delete().eq('id', deliverable.id)
    return { success: false, error: updateError.message }
  }

  return {
    success: true,
    data: {
      deliverable_id: deliverable.id,
      task_id: taskId,
    },
  }
}

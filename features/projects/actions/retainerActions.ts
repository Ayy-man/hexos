'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/api/notifications'
import { updateProject } from '@/lib/api/projects'
import {
  logCheckIn,
  getRetainerCheckIns,
  type CheckInHealth,
  type LogCheckInInput,
} from '@/lib/api/retainer-check-ins'
import {
  createRetainerTask,
  updateRetainerTask,
  deleteRetainerTask,
  getRetainerTasks,
  type CreateRetainerTaskInput,
  type UpdateRetainerTaskInput,
  type TaskPriority,
} from '@/lib/api/retainer-tasks'

// ============================================
// Read actions (for client component data fetching)
// ============================================

export async function getCheckInsAction(projectId: string) {
  try {
    const data = await getRetainerCheckIns(projectId)
    return { data }
  } catch (error) {
    console.error('[getCheckInsAction] Error:', error)
    return { data: [] }
  }
}

export async function getNextCheckInDueDateAction(projectId: string) {
  try {
    const { getNextCheckInDueDate } = await import('@/lib/api/retainer-check-ins')
    const data = await getNextCheckInDueDate(projectId)
    return { data }
  } catch (error) {
    console.error('[getNextCheckInDueDateAction] Error:', error)
    return { data: null }
  }
}

export async function getTasksAction(projectId: string) {
  try {
    const data = await getRetainerTasks(projectId)
    return { data }
  } catch (error) {
    console.error('[getTasksAction] Error:', error)
    return { data: [] }
  }
}

// ============================================
// Mutation actions
// ============================================

// Helper to get admin user IDs for notifications
async function getAdminUserIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
  return (data || []).map(p => p.id)
}

/**
 * Log a check-in for a retainer project
 * Sends retainer_health_warning notification to admins if health is not green
 */
export async function logCheckInAction(params: {
  projectId: string
  health: CheckInHealth
  notes?: string
}): Promise<{ data?: { id: string } } | { error: string }> {
  try {
    const checkIn = await logCheckIn({
      projectId: params.projectId,
      health: params.health,
      notes: params.notes,
    })

    // If health is yellow or red, notify admins
    if (params.health !== 'green') {
      const adminIds = await getAdminUserIds()

      const healthLabel = params.health === 'yellow' ? 'Yellow' : 'Red'
      const supabase = await createClient()
      const { data: project } = await supabase
        .from('projects')
        .select('project_name')
        .eq('id', params.projectId)
        .single()

      const projectName = project?.project_name || 'Project'

      // Send notification to each admin
      for (const adminId of adminIds) {
        await createNotification({
          userId: adminId,
          type: 'retainer_health_warning',
          title: `${healthLabel} Health Alert: ${projectName}`,
          message: params.notes || `Check-in health is ${params.health}`,
          projectId: params.projectId,
        })
      }
    }

    revalidatePath(`/projects/${params.projectId}`)
    return { data: { id: checkIn.id } }
  } catch (error) {
    console.error('[logCheckInAction] Error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to log check-in' }
  }
}

/**
 * Create a new retainer task
 * Sends retainer_task_assigned notification if assignee is provided
 */
export async function createRetainerTaskAction(params: {
  projectId: string
  title: string
  description?: string
  priority?: TaskPriority
  assigneeId?: string
}): Promise<{ data?: { id: string } } | { error: string }> {
  try {
    const task = await createRetainerTask({
      projectId: params.projectId,
      title: params.title,
      description: params.description,
      priority: params.priority,
      assigneeId: params.assigneeId,
    })

    // If assignee is provided, send notification
    if (params.assigneeId) {
      const supabase = await createClient()
      const { data: project } = await supabase
        .from('projects')
        .select('project_name')
        .eq('id', params.projectId)
        .single()

      const projectName = project?.project_name || 'Project'

      await createNotification({
        userId: params.assigneeId,
        type: 'retainer_task_assigned',
        title: 'New Retainer Task Assigned',
        message: `${params.title} - ${projectName}`,
        projectId: params.projectId,
      })
    }

    revalidatePath(`/projects/${params.projectId}`)
    return { data: { id: task.id } }
  } catch (error) {
    console.error('[createRetainerTaskAction] Error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to create retainer task' }
  }
}

/**
 * Update a retainer task
 * Sends retainer_task_assigned notification if assignee changed
 */
export async function updateRetainerTaskAction(params: {
  taskId: string
  projectId: string
  title?: string
  description?: string
  status?: 'todo' | 'in_progress' | 'done'
  priority?: TaskPriority
  assigneeId?: string | null
}): Promise<{ data?: { id: string } } | { error: string }> {
  try {
    // Get current task to check if assignee changed
    const supabase = await createClient()
    const { data: currentTask } = await supabase
      .from('retainer_tasks')
      .select('assignee_id')
      .eq('id', params.taskId)
      .single()

    const input: UpdateRetainerTaskInput = {}
    if (params.title !== undefined) input.title = params.title
    if (params.description !== undefined) input.description = params.description
    if (params.status !== undefined) input.status = params.status
    if (params.priority !== undefined) input.priority = params.priority
    if (params.assigneeId !== undefined) input.assigneeId = params.assigneeId

    const task = await updateRetainerTask(params.taskId, input)

    // If assignee changed and new assignee exists, send notification
    if (
      params.assigneeId !== undefined &&
      params.assigneeId !== null &&
      params.assigneeId !== currentTask?.assignee_id
    ) {
      const { data: project } = await supabase
        .from('projects')
        .select('project_name')
        .eq('id', params.projectId)
        .single()

      const projectName = project?.project_name || 'Project'

      await createNotification({
        userId: params.assigneeId,
        type: 'retainer_task_assigned',
        title: 'Retainer Task Assigned',
        message: `${task.title} - ${projectName}`,
        projectId: params.projectId,
      })
    }

    revalidatePath(`/projects/${params.projectId}`)
    return { data: { id: task.id } }
  } catch (error) {
    console.error('[updateRetainerTaskAction] Error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update retainer task' }
  }
}

/**
 * Delete a retainer task (admin only)
 */
export async function deleteRetainerTaskAction(params: {
  taskId: string
  projectId: string
}): Promise<{ data?: { success: true } } | { error: string }> {
  try {
    await deleteRetainerTask(params.taskId)

    revalidatePath(`/projects/${params.projectId}`)
    return { data: { success: true } }
  } catch (error) {
    console.error('[deleteRetainerTaskAction] Error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to delete retainer task' }
  }
}

/**
 * Update retainer configuration for a project
 * Unassigns tasks from removed devs
 */
export async function updateRetainerConfigAction(params: {
  projectId: string
  checkInCadence?: 'weekly' | 'biweekly' | 'monthly'
  checkInAssignees?: string[]
  retainerDevIds?: string[]
}): Promise<{ data?: { success: true } } | { error: string }> {
  try {
    const supabase = await createClient()

    // Get current retainer_dev_ids if we're updating them
    let removedDevIds: string[] = []
    if (params.retainerDevIds !== undefined) {
      const { data: currentProject } = await supabase
        .from('projects')
        .select('retainer_dev_ids')
        .eq('id', params.projectId)
        .single()

      const currentDevIds = currentProject?.retainer_dev_ids || []
      removedDevIds = currentDevIds.filter(
        (devId: string) => !params.retainerDevIds?.includes(devId)
      )
    }

    // Update project retainer config
    const updateData: {
      check_in_cadence?: 'weekly' | 'biweekly' | 'monthly'
      check_in_assignees?: string[]
      retainer_dev_ids?: string[]
    } = {}

    if (params.checkInCadence !== undefined) {
      updateData.check_in_cadence = params.checkInCadence
    }
    if (params.checkInAssignees !== undefined) {
      updateData.check_in_assignees = params.checkInAssignees
    }
    if (params.retainerDevIds !== undefined) {
      updateData.retainer_dev_ids = params.retainerDevIds
    }

    await updateProject(params.projectId, updateData)

    // Unassign tasks from removed devs
    if (removedDevIds.length > 0) {
      const { data: tasksToUnassign } = await supabase
        .from('retainer_tasks')
        .select('id')
        .eq('project_id', params.projectId)
        .in('assignee_id', removedDevIds)

      if (tasksToUnassign && tasksToUnassign.length > 0) {
        await supabase
          .from('retainer_tasks')
          .update({ assignee_id: null })
          .in('id', tasksToUnassign.map(t => t.id))
      }
    }

    revalidatePath(`/projects/${params.projectId}`)
    return { data: { success: true } }
  } catch (error) {
    console.error('[updateRetainerConfigAction] Error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update retainer config' }
  }
}

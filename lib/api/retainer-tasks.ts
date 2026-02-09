import { createClient } from '@/lib/supabase/server'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface RetainerTask {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  created_by: string
  completed_at: string | null
  created_at: string
  updated_at: string
  assignee?: {
    id: string
    name: string
  } | null
  creator?: {
    id: string
    name: string
  }
}

export interface CreateRetainerTaskInput {
  projectId: string
  title: string
  description?: string
  priority?: TaskPriority
  assigneeId?: string
}

export interface UpdateRetainerTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
}

/**
 * Get all retainer tasks for a project
 * Ordered by: status ASC (todo first), priority DESC (high first), created_at DESC
 */
export async function getRetainerTasks(projectId: string): Promise<RetainerTask[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('retainer_tasks')
    .select(`
      *,
      assignee:profiles!assignee_id(id, name),
      creator:profiles!created_by(id, name)
    `)
    .eq('project_id', projectId)
    .order('status', { ascending: true })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return normalizeTaskRelations(data || [])
}

/**
 * Get task counts by status for dashboard display
 */
export async function getRetainerTaskCounts(projectId: string): Promise<{
  todo: number
  in_progress: number
  done: number
  total: number
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('retainer_tasks')
    .select('status')
    .eq('project_id', projectId)

  if (error) throw error

  const counts = {
    todo: 0,
    in_progress: 0,
    done: 0,
    total: data?.length || 0,
  }

  data?.forEach((task) => {
    const status = task.status as TaskStatus
    if (status in counts) {
      counts[status]++
    }
  })

  return counts
}

/**
 * Create a new retainer task
 */
export async function createRetainerTask(input: CreateRetainerTaskInput): Promise<RetainerTask> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('retainer_tasks')
    .insert({
      project_id: input.projectId,
      title: input.title,
      description: input.description || null,
      priority: input.priority || 'medium',
      assignee_id: input.assigneeId || null,
      created_by: user.id,
    })
    .select(`
      *,
      assignee:profiles!assignee_id(id, name),
      creator:profiles!created_by(id, name)
    `)
    .single()

  if (error) throw error
  return normalizeTaskRelations([data])[0]
}

/**
 * Update a retainer task
 * Automatically manages completed_at timestamp based on status changes
 */
export async function updateRetainerTask(
  taskId: string,
  input: UpdateRetainerTaskInput
): Promise<RetainerTask> {
  const supabase = await createClient()

  // If status is changing to/from 'done', manage completed_at
  const updateData: Record<string, unknown> = { ...input }

  if (input.status === 'done') {
    // Setting to done - set completed_at
    updateData.completed_at = new Date().toISOString()
  } else if (input.status) {
    // Changing status to something other than done
    // First check if it was previously done - if so, clear completed_at
    const { data: currentTask } = await supabase
      .from('retainer_tasks')
      .select('status')
      .eq('id', taskId)
      .single()

    if (currentTask?.status === 'done') {
      updateData.completed_at = null
    }
  }

  // Handle assigneeId -> assignee_id mapping
  if ('assigneeId' in input) {
    updateData.assignee_id = input.assigneeId
    delete updateData.assigneeId
  }

  const { data, error } = await supabase
    .from('retainer_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select(`
      *,
      assignee:profiles!assignee_id(id, name),
      creator:profiles!created_by(id, name)
    `)
    .single()

  if (error) throw error
  return normalizeTaskRelations([data])[0]
}

/**
 * Delete a retainer task (admin only via RLS)
 */
export async function deleteRetainerTask(taskId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('retainer_tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
}

// Helper to normalize relations from Supabase array format
function normalizeTaskRelations(tasks: Record<string, unknown>[]): RetainerTask[] {
  return tasks.map((task) => {
    const assignee = Array.isArray(task.assignee)
      ? task.assignee[0]
      : task.assignee
    const creator = Array.isArray(task.creator)
      ? task.creator[0]
      : task.creator

    return {
      ...task,
      assignee: assignee || null,
      creator,
    } as RetainerTask
  })
}

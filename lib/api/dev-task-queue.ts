import { createClient } from '@/lib/supabase/server'

// Types
export interface TaskQueueItem {
  id: string
  user_id: string
  deliverable_id: string
  position: number
  is_starred: boolean
  is_working_on: boolean
  added_at: string
  deliverable?: {
    id: string
    title: string
    description: string | null
    status: string
    due_date: string | null
    project_id: string
    project?: {
      id: string
      project_name: string
      client_name: string
    }
  }
}

/**
 * Get current user's task queue
 */
export async function getMyTaskQueue(): Promise<TaskQueueItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('dev_task_queue')
    .select(`
      *,
      deliverable:deliverables(
        id,
        title,
        description,
        status,
        due_date,
        project_id,
        project:projects(id, project_name, client_name)
      )
    `)
    .eq('user_id', user.id)
    .order('position', { ascending: true })

  if (error) throw error
  return (data || []).map(normalizeQueueItemRelations)
}

/**
 * Get today's focus - starred or top items
 */
export async function getTodaysFocus(limit: number = 3): Promise<TaskQueueItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  // First try to get starred items
  const { data: starred, error: starredError } = await supabase
    .from('dev_task_queue')
    .select(`
      *,
      deliverable:deliverables(
        id,
        title,
        description,
        status,
        due_date,
        project_id,
        project:projects(id, project_name, client_name)
      )
    `)
    .eq('user_id', user.id)
    .eq('is_starred', true)
    .order('position', { ascending: true })
    .limit(limit)

  if (starredError) throw starredError

  // If we have enough starred items, return them
  if ((starred || []).length >= limit) {
    return (starred || []).map(normalizeQueueItemRelations)
  }

  // Otherwise, fill with top items by position
  const existingIds = (starred || []).map(s => s.deliverable_id)
  const remaining = limit - (starred || []).length

  const { data: topItems, error: topError } = await supabase
    .from('dev_task_queue')
    .select(`
      *,
      deliverable:deliverables(
        id,
        title,
        description,
        status,
        due_date,
        project_id,
        project:projects(id, project_name, client_name)
      )
    `)
    .eq('user_id', user.id)
    .eq('is_starred', false)
    .not('deliverable_id', 'in', `(${existingIds.length > 0 ? existingIds.map(id => `"${id}"`).join(',') : 'null'})`)
    .order('position', { ascending: true })
    .limit(remaining)

  if (topError) throw topError

  const combined = [...(starred || []), ...(topItems || [])]
  return combined.map(normalizeQueueItemRelations)
}

/**
 * Reorder tasks in the queue
 */
export async function reorderTasks(updates: { id: string; position: number }[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Update each item's position
  for (const update of updates) {
    const { error } = await supabase
      .from('dev_task_queue')
      .update({ position: update.position })
      .eq('id', update.id)
      .eq('user_id', user.id) // Ensure user owns this item

    if (error) throw error
  }
}

/**
 * Set is_working_on for a task
 */
export async function setWorkingOn(deliverableId: string, isWorkingOn: boolean): Promise<TaskQueueItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // If setting to true, clear other is_working_on first
  if (isWorkingOn) {
    const { error: clearError } = await supabase
      .from('dev_task_queue')
      .update({ is_working_on: false })
      .eq('user_id', user.id)
      .eq('is_working_on', true)

    if (clearError) throw clearError
  }

  const { data, error } = await supabase
    .from('dev_task_queue')
    .update({ is_working_on: isWorkingOn })
    .eq('user_id', user.id)
    .eq('deliverable_id', deliverableId)
    .select(`
      *,
      deliverable:deliverables(
        id,
        title,
        status,
        project_id,
        project:projects(id, project_name)
      )
    `)
    .single()

  if (error) throw error
  return normalizeQueueItemRelations(data)
}

/**
 * Toggle starred status for a task
 */
export async function toggleStarred(deliverableId: string): Promise<TaskQueueItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get current state
  const { data: current, error: fetchError } = await supabase
    .from('dev_task_queue')
    .select('is_starred')
    .eq('user_id', user.id)
    .eq('deliverable_id', deliverableId)
    .single()

  if (fetchError) throw fetchError

  // Toggle
  const { data, error } = await supabase
    .from('dev_task_queue')
    .update({ is_starred: !current.is_starred })
    .eq('user_id', user.id)
    .eq('deliverable_id', deliverableId)
    .select(`
      *,
      deliverable:deliverables(
        id,
        title,
        status,
        project_id,
        project:projects(id, project_name)
      )
    `)
    .single()

  if (error) throw error
  return normalizeQueueItemRelations(data)
}

/**
 * Get the current "working on" item
 */
export async function getCurrentlyWorkingOn(): Promise<TaskQueueItem | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('dev_task_queue')
    .select(`
      *,
      deliverable:deliverables(
        id,
        title,
        status,
        project_id,
        project:projects(id, project_name, client_name)
      )
    `)
    .eq('user_id', user.id)
    .eq('is_working_on', true)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null

  return normalizeQueueItemRelations(data)
}

/**
 * Add a deliverable to the queue manually
 */
export async function addToQueue(deliverableId: string): Promise<TaskQueueItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get max position
  const { data: maxData } = await supabase
    .from('dev_task_queue')
    .select('position')
    .eq('user_id', user.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const nextPosition = (maxData?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('dev_task_queue')
    .insert({
      user_id: user.id,
      deliverable_id: deliverableId,
      position: nextPosition,
    })
    .select(`
      *,
      deliverable:deliverables(
        id,
        title,
        status,
        project_id,
        project:projects(id, project_name)
      )
    `)
    .single()

  if (error) throw error
  return normalizeQueueItemRelations(data)
}

/**
 * Remove a deliverable from the queue
 */
export async function removeFromQueue(deliverableId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('dev_task_queue')
    .delete()
    .eq('user_id', user.id)
    .eq('deliverable_id', deliverableId)

  if (error) throw error
}

/**
 * Get queue stats for current user
 */
export async function getQueueStats(): Promise<{
  total: number
  starred: number
  working_on: number
  by_status: Record<string, number>
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { total: 0, starred: 0, working_on: 0, by_status: {} }
  }

  const { data, error } = await supabase
    .from('dev_task_queue')
    .select(`
      is_starred,
      is_working_on,
      deliverable:deliverables(status)
    `)
    .eq('user_id', user.id)

  if (error) throw error

  const stats = {
    total: (data || []).length,
    starred: (data || []).filter(d => d.is_starred).length,
    working_on: (data || []).filter(d => d.is_working_on).length,
    by_status: {} as Record<string, number>,
  }

  for (const item of data || []) {
    const deliverable = Array.isArray(item.deliverable)
      ? item.deliverable[0]
      : item.deliverable
    if (deliverable?.status) {
      stats.by_status[deliverable.status] = (stats.by_status[deliverable.status] || 0) + 1
    }
  }

  return stats
}

// Helper to normalize relations from Supabase array format
function normalizeQueueItemRelations(item: Record<string, unknown>): TaskQueueItem {
  const deliverable = Array.isArray(item.deliverable)
    ? item.deliverable[0]
    : item.deliverable

  if (deliverable && typeof deliverable === 'object' && 'project' in deliverable) {
    const project = Array.isArray(deliverable.project)
      ? deliverable.project[0]
      : deliverable.project
    deliverable.project = project
  }

  return {
    ...item,
    deliverable,
  } as TaskQueueItem
}

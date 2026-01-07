import { createClient } from '@/lib/supabase/server'
import type { PulseDailyTask, CreateTaskInput, UpdateTaskInput } from '@/lib/types/pulse'
import { logPulseEvent } from './pulse'

// ============================================================================
// CRUD Operations
// ============================================================================

export async function getTasksForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<PulseDailyTask[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_daily_tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('position', { ascending: true })

  if (error) {
    console.error('[Pulse Tasks] Failed to fetch tasks:', error)
    return []
  }

  return data as PulseDailyTask[]
}

export async function getTasksForDate(
  userId: string,
  date: string
): Promise<PulseDailyTask[]> {
  return getTasksForDateRange(userId, date, date)
}

export async function createTask(
  userId: string,
  input: CreateTaskInput
): Promise<PulseDailyTask | null> {
  const supabase = await createClient()

  // Get max position for this date
  const { data: existing } = await supabase
    .from('pulse_daily_tasks')
    .select('position')
    .eq('user_id', userId)
    .eq('date', input.date)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = input.position ?? ((existing?.[0]?.position ?? -1) + 1)

  const { data, error } = await supabase
    .from('pulse_daily_tasks')
    .insert({
      user_id: userId,
      date: input.date,
      title: input.title,
      linked_action_id: input.linked_action_id || null,
      position: nextPosition,
    })
    .select()
    .single()

  if (error) {
    console.error('[Pulse Tasks] Failed to create task:', error)
    return null
  }

  return data as PulseDailyTask
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
): Promise<PulseDailyTask | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_daily_tasks')
    .update(input)
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    console.error('[Pulse Tasks] Failed to update task:', error)
    return null
  }

  return data as PulseDailyTask
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pulse_daily_tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    console.error('[Pulse Tasks] Failed to delete task:', error)
    return false
  }

  return true
}

// ============================================================================
// Task Completion
// ============================================================================

export async function completeTask(
  taskId: string,
  userId: string
): Promise<PulseDailyTask | null> {
  const supabase = await createClient()

  // Get the task to check if it's linked to an action
  const { data: task, error: fetchError } = await supabase
    .from('pulse_daily_tasks')
    .select('*, linked_action_id')
    .eq('id', taskId)
    .single()

  if (fetchError || !task) {
    console.error('[Pulse Tasks] Failed to fetch task for completion:', fetchError)
    return null
  }

  // Update task completion
  const { data, error } = await supabase
    .from('pulse_daily_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    console.error('[Pulse Tasks] Failed to complete task:', error)
    return null
  }

  // Log pulse event
  const eventType = task.linked_action_id ? 'linked_task_completed' : 'task_completed'
  await logPulseEvent(userId, eventType, 'task', taskId)

  // If linked to an action, complete the action too
  if (task.linked_action_id) {
    await supabase
      .from('pulse_actions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', task.linked_action_id)

    // Log action completion event
    await logPulseEvent(userId, 'action_completed', 'action', task.linked_action_id)

    // Check if all actions for the target are complete
    await checkAndCompleteTarget(task.linked_action_id)
  }

  return data as PulseDailyTask
}

export async function uncompleteTask(taskId: string): Promise<PulseDailyTask | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_daily_tasks')
    .update({ completed_at: null })
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    console.error('[Pulse Tasks] Failed to uncomplete task:', error)
    return null
  }

  // Note: We don't remove pulse events when uncompleting
  // Points are earned, not unearned

  return data as PulseDailyTask
}

// ============================================================================
// Task Rollover
// ============================================================================

export async function rolloverIncompleteTasks(
  userId: string,
  fromDate: string,
  toDate: string
): Promise<PulseDailyTask[]> {
  const supabase = await createClient()

  // Get incomplete tasks from the previous date
  const { data: incompleteTasks, error: fetchError } = await supabase
    .from('pulse_daily_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', fromDate)
    .is('completed_at', null)
    .order('position', { ascending: true })

  if (fetchError || !incompleteTasks?.length) {
    return []
  }

  // Check if tasks already exist for toDate (avoid duplicate rollover)
  const { data: existingTasks } = await supabase
    .from('pulse_daily_tasks')
    .select('rolled_from')
    .eq('user_id', userId)
    .eq('date', toDate)
    .not('rolled_from', 'is', null)

  const alreadyRolledIds = new Set(existingTasks?.map(t => t.rolled_from) || [])

  // Filter out tasks that have already been rolled over
  const tasksToRoll = incompleteTasks.filter(t => !alreadyRolledIds.has(t.id))

  if (!tasksToRoll.length) {
    return []
  }

  // Get max position for toDate
  const { data: existing } = await supabase
    .from('pulse_daily_tasks')
    .select('position')
    .eq('user_id', userId)
    .eq('date', toDate)
    .order('position', { ascending: false })
    .limit(1)

  let nextPosition = (existing?.[0]?.position ?? -1) + 1

  // Create rolled-over tasks
  const newTasks = tasksToRoll.map(task => ({
    user_id: userId,
    date: toDate,
    title: task.title,
    linked_action_id: task.linked_action_id,
    rolled_from: task.id,
    position: nextPosition++,
  }))

  const { data, error } = await supabase
    .from('pulse_daily_tasks')
    .insert(newTasks)
    .select()

  if (error) {
    console.error('[Pulse Tasks] Failed to rollover tasks:', error)
    return []
  }

  return data as PulseDailyTask[]
}

// ============================================================================
// Reordering
// ============================================================================

export async function reorderTasks(
  userId: string,
  date: string,
  taskIds: string[]
): Promise<boolean> {
  const supabase = await createClient()

  // Update positions based on array order
  const updates = taskIds.map((id, index) =>
    supabase
      .from('pulse_daily_tasks')
      .update({ position: index })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('date', date)
  )

  try {
    await Promise.all(updates)
    return true
  } catch (error) {
    console.error('[Pulse Tasks] Failed to reorder tasks:', error)
    return false
  }
}

export async function moveTaskToDate(
  taskId: string,
  newDate: string
): Promise<PulseDailyTask | null> {
  const supabase = await createClient()

  // Get the task's user_id
  const { data: task } = await supabase
    .from('pulse_daily_tasks')
    .select('user_id')
    .eq('id', taskId)
    .single()

  if (!task) return null

  // Get max position for new date
  const { data: existing } = await supabase
    .from('pulse_daily_tasks')
    .select('position')
    .eq('user_id', task.user_id)
    .eq('date', newDate)
    .order('position', { ascending: false })
    .limit(1)

  const newPosition = (existing?.[0]?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('pulse_daily_tasks')
    .update({
      date: newDate,
      position: newPosition,
    })
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    console.error('[Pulse Tasks] Failed to move task:', error)
    return null
  }

  return data as PulseDailyTask
}

// ============================================================================
// Helper Functions
// ============================================================================

async function checkAndCompleteTarget(actionId: string): Promise<void> {
  const supabase = await createClient()

  // Get the action's target
  const { data: action } = await supabase
    .from('pulse_actions')
    .select('target_id, owner_id')
    .eq('id', actionId)
    .single()

  if (!action?.target_id) return

  // Check if all actions for this target are complete
  const { data: actions } = await supabase
    .from('pulse_actions')
    .select('completed_at')
    .eq('target_id', action.target_id)

  const allComplete = actions?.every(a => a.completed_at != null)

  if (allComplete && actions && actions.length > 0) {
    // Complete the target
    await supabase
      .from('pulse_targets')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', action.target_id)

    // Log target completion event
    if (action.owner_id) {
      await logPulseEvent(action.owner_id, 'target_completed', 'target', action.target_id)
    }
  }
}

// ============================================================================
// Focus Tasks
// ============================================================================

export async function getFocusTasksForDate(
  userId: string,
  date: string
): Promise<PulseDailyTask[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pulse_daily_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('is_focus', true)
    .order('position')

  if (error) {
    console.error('[Pulse] Failed to fetch focus tasks:', error)
    return []
  }

  return data as PulseDailyTask[]
}

export async function createFocusTask(
  userId: string,
  title: string,
  date: string
): Promise<PulseDailyTask | null> {
  const supabase = await createClient()

  // Check if already at max focus items (3)
  const { count } = await supabase
    .from('pulse_daily_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('date', date)
    .eq('is_focus', true)

  if ((count || 0) >= 3) {
    console.error('[Pulse] Max focus items (3) reached')
    return null
  }

  // Get next position
  const { data: lastTask } = await supabase
    .from('pulse_daily_tasks')
    .select('position')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('is_focus', true)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (lastTask?.position || 0) + 1

  const { data, error } = await supabase
    .from('pulse_daily_tasks')
    .insert({
      user_id: userId,
      date,
      title,
      is_focus: true,
      position,
    })
    .select()
    .single()

  if (error) {
    console.error('[Pulse] Failed to create focus task:', error)
    return null
  }

  return data as PulseDailyTask
}

export async function completeFocusTask(
  taskId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient()

  // Get the task to check if it has linked action
  const { data: task } = await supabase
    .from('pulse_daily_tasks')
    .select('linked_action_id')
    .eq('id', taskId)
    .single()

  // Update the task as completed
  const { error } = await supabase
    .from('pulse_daily_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) {
    console.error('[Pulse] Failed to complete focus task:', error)
    return false
  }

  // Log points - focus items get more points
  // Using 'task_completed' event type for now (would ideally have 'focus_completed')
  if (task?.linked_action_id) {
    await logPulseEvent(userId, 'linked_task_completed', 'task', taskId)
  } else {
    await logPulseEvent(userId, 'task_completed', 'task', taskId)
  }

  return true
}

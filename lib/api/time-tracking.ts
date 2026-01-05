import { createClient } from '@/lib/supabase/server'

// Types
export interface TimeEntry {
  id: string
  deliverable_id: string
  user_id: string
  duration_minutes: number
  description: string | null
  entry_date: string
  started_at: string | null
  ended_at: string | null
  is_manual: boolean
  created_at: string
  deliverable?: {
    id: string
    title: string
    project_id: string
  }
}

export interface ActiveTimer {
  id: string
  user_id: string
  deliverable_id: string
  started_at: string
  deliverable?: {
    id: string
    title: string
    project_id: string
    project?: {
      id: string
      project_name: string
    }
  }
}

export interface DailySummary {
  date: string
  total_minutes: number
  entries: TimeEntry[]
}

export interface WeeklySummary {
  week_start: string
  week_end: string
  total_minutes: number
  daily_breakdown: { date: string; minutes: number }[]
}

/**
 * Start a timer for a deliverable
 * Stops any existing timer first
 */
export async function startTimer(deliverableId: string): Promise<ActiveTimer> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Stop any existing timer first (convert to time entry)
  await stopTimer()

  // Start new timer
  const { data, error } = await supabase
    .from('active_timers')
    .insert({
      user_id: user.id,
      deliverable_id: deliverableId,
      started_at: new Date().toISOString(),
    })
    .select(`
      *,
      deliverable:deliverables(
        id,
        title,
        project_id,
        project:projects(id, project_name)
      )
    `)
    .single()

  if (error) throw error
  return normalizeTimerRelations(data)
}

/**
 * Stop the current timer and convert to time entry
 */
export async function stopTimer(): Promise<TimeEntry | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get current timer
  const { data: timer, error: fetchError } = await supabase
    .from('active_timers')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError
  if (!timer) return null

  const now = new Date()
  const startedAt = new Date(timer.started_at)
  const durationMinutes = Math.max(1, Math.round((now.getTime() - startedAt.getTime()) / 60000))

  // Create time entry
  const { data: entry, error: insertError } = await supabase
    .from('time_entries')
    .insert({
      deliverable_id: timer.deliverable_id,
      user_id: user.id,
      duration_minutes: durationMinutes,
      entry_date: now.toISOString().split('T')[0],
      started_at: timer.started_at,
      ended_at: now.toISOString(),
      is_manual: false,
    })
    .select()
    .single()

  if (insertError) throw insertError

  // Delete timer
  const { error: deleteError } = await supabase
    .from('active_timers')
    .delete()
    .eq('id', timer.id)

  if (deleteError) throw deleteError

  return entry
}

/**
 * Get current active timer for user
 */
export async function getActiveTimer(): Promise<ActiveTimer | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('active_timers')
    .select(`
      *,
      deliverable:deliverables(
        id,
        title,
        project_id,
        project:projects(id, project_name)
      )
    `)
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null

  return normalizeTimerRelations(data)
}

/**
 * Add a manual time entry
 */
export async function addManualTimeEntry(params: {
  deliverableId: string
  durationMinutes: number
  description?: string
  date?: string
}): Promise<TimeEntry> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      deliverable_id: params.deliverableId,
      user_id: user.id,
      duration_minutes: params.durationMinutes,
      description: params.description || null,
      entry_date: params.date || new Date().toISOString().split('T')[0],
      is_manual: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a time entry
 */
export async function updateTimeEntry(
  entryId: string,
  updates: { duration_minutes?: number; description?: string; entry_date?: string }
): Promise<TimeEntry> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('time_entries')
    .update(updates)
    .eq('id', entryId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a time entry
 */
export async function deleteTimeEntry(entryId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', entryId)

  if (error) throw error
}

/**
 * Get time entries for a specific deliverable
 */
export async function getTimeEntriesForDeliverable(deliverableId: string): Promise<TimeEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get current user's time entries for a date range
 */
export async function getMyTimeEntries(startDate: string, endDate: string): Promise<TimeEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      deliverable:deliverables(id, title, project_id)
    `)
    .eq('user_id', user.id)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeEntryRelations)
}

/**
 * Get daily time summary for a specific date
 */
export async function getDailyTimeSummary(date: string): Promise<DailySummary> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { date, total_minutes: 0, entries: [] }
  }

  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      deliverable:deliverables(id, title, project_id)
    `)
    .eq('user_id', user.id)
    .eq('entry_date', date)
    .order('created_at', { ascending: false })

  if (error) throw error

  const entries = (data || []).map(normalizeEntryRelations)
  const total_minutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0)

  return { date, total_minutes, entries }
}

/**
 * Get weekly time summary (current week)
 */
export async function getWeeklyTimeSummary(): Promise<WeeklySummary> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Calculate week boundaries (Monday to Sunday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + mondayOffset)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const startStr = weekStart.toISOString().split('T')[0]
  const endStr = weekEnd.toISOString().split('T')[0]

  if (!user) {
    return {
      week_start: startStr,
      week_end: endStr,
      total_minutes: 0,
      daily_breakdown: [],
    }
  }

  const { data, error } = await supabase
    .from('time_entries')
    .select('entry_date, duration_minutes')
    .eq('user_id', user.id)
    .gte('entry_date', startStr)
    .lte('entry_date', endStr)

  if (error) throw error

  // Aggregate by day
  const dailyMap = new Map<string, number>()
  for (const entry of data || []) {
    const current = dailyMap.get(entry.entry_date) || 0
    dailyMap.set(entry.entry_date, current + entry.duration_minutes)
  }

  const daily_breakdown = Array.from(dailyMap.entries())
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const total_minutes = daily_breakdown.reduce((sum, d) => sum + d.minutes, 0)

  return {
    week_start: startStr,
    week_end: endStr,
    total_minutes,
    daily_breakdown,
  }
}

/**
 * Get total time logged for a project
 */
export async function getProjectTimeTotal(projectId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('time_entries')
    .select('duration_minutes, deliverable:deliverables!inner(project_id)')
    .eq('deliverable.project_id', projectId)

  if (error) throw error

  return (data || []).reduce((sum, e) => sum + e.duration_minutes, 0)
}

// Helper to normalize relations from Supabase array format
function normalizeTimerRelations(timer: Record<string, unknown>): ActiveTimer {
  const deliverable = Array.isArray(timer.deliverable)
    ? timer.deliverable[0]
    : timer.deliverable

  if (deliverable && typeof deliverable === 'object' && 'project' in deliverable) {
    const project = Array.isArray(deliverable.project)
      ? deliverable.project[0]
      : deliverable.project
    deliverable.project = project
  }

  return {
    ...timer,
    deliverable,
  } as ActiveTimer
}

function normalizeEntryRelations(entry: Record<string, unknown>): TimeEntry {
  const deliverable = Array.isArray(entry.deliverable)
    ? entry.deliverable[0]
    : entry.deliverable

  return {
    ...entry,
    deliverable,
  } as TimeEntry
}

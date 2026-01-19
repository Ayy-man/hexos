import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export interface PositionHistoryEntry {
  id: string
  deliverable_id: string
  position: number
  note: string | null
  created_at: string
  created_by: string | null
}

export interface DeliverableWithHillChart {
  id: string
  project_id: string
  parent_id: string | null
  title: string
  description: string | null
  status: string
  estimated_hours: number | null
  start_date: string | null
  due_date: string | null
  completed_at: string | null
  sort_order: number
  created_at: string
  hill_position: number
  hill_color: string | null
}

export interface DeliverableWithHistory extends DeliverableWithHillChart {
  position_history: PositionHistoryEntry[]
  children?: DeliverableWithHistory[]
}

export interface HillChartItem {
  id: string
  name: string
  x: number
  color: string
  deadline: string | null
  history: Array<{ x: number; timestamp: string }>
}

export interface ParentHillChartItem extends HillChartItem {
  subCount: number
  children: HillChartItem[]
}

// ============================================
// Zone Classification
// ============================================

export type HillZone = 'figuring_out' | 'making_it' | 'done'

export interface ZoneInfo {
  zone: HillZone
  label: string
  colorClass: string
  bgClass: string
}

export function getZone(position: number): ZoneInfo {
  if (position < 50) {
    return {
      zone: 'figuring_out',
      label: 'Figuring Out',
      colorClass: 'text-amber-500',
      bgClass: 'bg-amber-500/15',
    }
  }
  if (position < 90) {
    return {
      zone: 'making_it',
      label: 'Making It',
      colorClass: 'text-cyan-500',
      bgClass: 'bg-cyan-500/15',
    }
  }
  return {
    zone: 'done',
    label: 'Done',
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/15',
  }
}

// ============================================
// API Functions
// ============================================

/**
 * Get all deliverables for a project with their position history
 * Returns hierarchical structure (parents with children)
 */
export async function getDeliverablesWithHistory(
  projectId: string
): Promise<DeliverableWithHistory[]> {
  const supabase = await createClient()

  // Fetch all deliverables with their history
  const { data: deliverables, error: delError } = await supabase
    .from('deliverables')
    .select(
      `
      *,
      position_history:deliverable_position_history(
        id,
        position,
        note,
        created_at,
        created_by
      )
    `
    )
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (delError) throw delError

  // Order history by created_at ascending
  const deliverablesWithSortedHistory = (deliverables || []).map((d) => ({
    ...d,
    position_history: (d.position_history || []).sort(
      (a: PositionHistoryEntry, b: PositionHistoryEntry) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  })) as DeliverableWithHistory[]

  // Build hierarchy: separate parents (no parent_id) and children
  const parents = deliverablesWithSortedHistory.filter((d) => !d.parent_id)
  const children = deliverablesWithSortedHistory.filter((d) => d.parent_id)

  // Attach children to parents
  return parents.map((parent) => ({
    ...parent,
    children: children.filter((c) => c.parent_id === parent.id),
  }))
}

/**
 * Get position history for a single deliverable
 */
export async function getPositionHistory(
  deliverableId: string
): Promise<PositionHistoryEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverable_position_history')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as PositionHistoryEntry[]
}

/**
 * Update a deliverable's hill chart position
 * Only creates one history entry per day - subsequent updates on the same day update the existing entry
 */
export async function updateHillPosition(
  deliverableId: string,
  position: number,
  note?: string
): Promise<{ deliverable: DeliverableWithHillChart; historyEntry: PositionHistoryEntry }> {
  const supabase = await createClient()

  // Clamp position to 0-100
  const clampedPosition = Math.max(0, Math.min(100, Math.round(position)))

  // Update the deliverable's position
  const { data: deliverable, error: delError } = await supabase
    .from('deliverables')
    .update({ hill_position: clampedPosition })
    .eq('id', deliverableId)
    .select()
    .single()

  if (delError) throw delError

  // Check if there's already a history entry for today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: existingEntry } = await supabase
    .from('deliverable_position_history')
    .select('id')
    .eq('deliverable_id', deliverableId)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let historyEntry: PositionHistoryEntry

  if (existingEntry) {
    // Update existing entry for today
    const { data, error: histError } = await supabase
      .from('deliverable_position_history')
      .update({
        position: clampedPosition,
        note: note || null,
      })
      .eq('id', existingEntry.id)
      .select()
      .single()

    if (histError) throw histError
    historyEntry = data as PositionHistoryEntry
  } else {
    // Create new entry for today
    const { data, error: histError } = await supabase
      .from('deliverable_position_history')
      .insert({
        deliverable_id: deliverableId,
        position: clampedPosition,
        note: note || null,
      })
      .select()
      .single()

    if (histError) throw histError
    historyEntry = data as PositionHistoryEntry
  }

  return {
    deliverable: deliverable as DeliverableWithHillChart,
    historyEntry,
  }
}

/**
 * Batch update multiple deliverable positions
 * Only creates one history entry per day per deliverable - subsequent updates on the same day update the existing entry
 */
export async function batchUpdatePositions(
  updates: Array<{ id: string; position: number; note?: string }>
): Promise<void> {
  const supabase = await createClient()

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Process updates in parallel
  const promises = updates.map(async ({ id, position, note }) => {
    const clampedPosition = Math.max(0, Math.min(100, Math.round(position)))

    // Update deliverable
    await supabase
      .from('deliverables')
      .update({ hill_position: clampedPosition })
      .eq('id', id)

    // Check if there's already a history entry for today
    const { data: existingEntry } = await supabase
      .from('deliverable_position_history')
      .select('id')
      .eq('deliverable_id', id)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingEntry) {
      // Update existing entry for today
      await supabase
        .from('deliverable_position_history')
        .update({
          position: clampedPosition,
          note: note || null,
        })
        .eq('id', existingEntry.id)
    } else {
      // Create new entry for today
      await supabase.from('deliverable_position_history').insert({
        deliverable_id: id,
        position: clampedPosition,
        note: note || null,
      })
    }
  })

  await Promise.all(promises)
}

/**
 * Check if a deliverable was logged today
 */
export async function wasLoggedToday(deliverableId: string): Promise<boolean> {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('deliverable_position_history')
    .select('*', { count: 'exact', head: true })
    .eq('deliverable_id', deliverableId)
    .gte('created_at', today.toISOString())

  if (error) throw error
  return (count || 0) > 0
}

// ============================================
// Data Transformation Helpers
// ============================================

/**
 * Transform database deliverable to hill chart item format
 */
export function toHillChartItem(deliverable: DeliverableWithHistory): HillChartItem {
  return {
    id: deliverable.id,
    name: deliverable.title,
    x: deliverable.hill_position,
    color: deliverable.hill_color || '#00d4ff',
    deadline: deliverable.due_date,
    history: (deliverable.position_history || []).map((h) => ({
      x: h.position,
      timestamp: h.created_at,
    })),
  }
}

/**
 * Transform parent deliverable with children to parent hill chart item
 * Parent's x position is the average of children's positions
 */
export function toParentHillChartItem(parent: DeliverableWithHistory): ParentHillChartItem {
  const children = parent.children || []
  const childItems = children.map(toHillChartItem)

  // Calculate parent position as average of children
  // If no children, use parent's own position
  const avgPosition =
    children.length > 0
      ? Math.round(children.reduce((sum, c) => sum + c.hill_position, 0) / children.length)
      : parent.hill_position

  // Build synthetic history from children's history
  // For each timestamp, calculate the average position at that point
  const allTimestamps = new Set<string>()
  children.forEach((c) => {
    c.position_history?.forEach((h) => allTimestamps.add(h.created_at))
  })

  const sortedTimestamps = Array.from(allTimestamps).sort()
  const syntheticHistory = sortedTimestamps.map((timestamp) => {
    // For each child, find the position at or before this timestamp
    const positionsAtTime = children.map((c) => {
      const historyUpToTime = (c.position_history || [])
        .filter((h) => h.created_at <= timestamp)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      return historyUpToTime[0]?.position ?? c.hill_position
    })

    const avg =
      positionsAtTime.length > 0
        ? Math.round(positionsAtTime.reduce((a, b) => a + b, 0) / positionsAtTime.length)
        : 0

    return { x: avg, timestamp }
  })

  return {
    id: parent.id,
    name: parent.title,
    x: avgPosition,
    color: parent.hill_color || '#00d4ff',
    deadline: parent.due_date,
    history: syntheticHistory,
    subCount: children.length,
    children: childItems,
  }
}

/**
 * Calculate days until deadline or days overdue
 */
export function getDeadlineStatus(
  dueDate: string | null,
  currentPosition: number
): {
  isOverdue: boolean
  daysRemaining: number | null
  label: string | null
} {
  if (!dueDate) {
    return { isOverdue: false, daysRemaining: null, label: null }
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const deadline = new Date(dueDate)
  deadline.setHours(0, 0, 0, 0)

  const diffTime = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const isOverdue = diffDays < 0 && currentPosition < 100

  let label: string | null = null
  if (isOverdue) {
    label = `${Math.abs(diffDays)}d overdue`
  } else if (diffDays === 0) {
    label = 'Due today'
  } else if (diffDays > 0) {
    label = `${diffDays}d left`
  }

  return { isOverdue, daysRemaining: diffDays, label }
}

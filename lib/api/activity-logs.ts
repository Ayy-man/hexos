import { createClient as createAdminClient } from '@/lib/supabase/admin'
import type {
  ActivityLog,
  ActivityLogWithUser,
  ActivityLogFilters,
  ActivityLogStats,
  ActivityLogCategory,
} from '@/lib/types/activity-logs'

// Re-export types for convenience
export type {
  ActivityLog,
  ActivityLogWithUser,
  ActivityLogFilters,
  ActivityLogStats,
  ActivityLogCategory,
} from '@/lib/types/activity-logs'

export {
  formatActivityCategory,
  getActivityCategoryColor,
  formatActivityAction,
  formatEntityType,
  ENTITY_TYPES,
} from '@/lib/types/activity-logs'

/**
 * Get activity logs with filters and pagination
 */
export async function getActivityLogs(
  filters?: ActivityLogFilters
): Promise<{ data: ActivityLogWithUser[]; count: number }> {
  const supabase = createAdminClient()

  let query = supabase
    .from('activity_logs')
    .select(
      `
      *,
      user:profiles!user_id(id, name, email, role)
    `,
      { count: 'exact' }
    )
    .order('timestamp', { ascending: false })

  // Apply filters
  if (filters?.search) {
    query = query.textSearch('search_text', filters.search, {
      type: 'websearch',
      config: 'english',
    })
  }

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id)
  }

  if (filters?.entity_type) {
    query = query.eq('entity_type', filters.entity_type)
  }

  if (filters?.entity_id) {
    query = query.eq('entity_id', filters.entity_id)
  }

  if (filters?.from_date) {
    query = query.gte('timestamp', filters.from_date)
  }

  if (filters?.to_date) {
    query = query.lte('timestamp', filters.to_date)
  }

  // Pagination
  const limit = filters?.limit || 50
  const offset = filters?.offset || 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching activity logs:', error)
    return { data: [], count: 0 }
  }

  // Normalize user relation (Supabase returns array for single relations sometimes)
  const normalizedData = (data || []).map((log) => {
    const user = Array.isArray(log.user) ? log.user[0] : log.user
    return { ...log, user } as ActivityLogWithUser
  })

  return {
    data: normalizedData,
    count: count || 0,
  }
}

/**
 * Get activity logs for a specific entity
 */
export async function getEntityActivityLogs(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<ActivityLogWithUser[]> {
  const { data } = await getActivityLogs({
    entity_type: entityType,
    entity_id: entityId,
    limit,
  })
  return data
}

/**
 * Get activity log stats for admin dashboard
 */
export async function getActivityLogStats(): Promise<ActivityLogStats | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('get_activity_log_stats')

  if (error) {
    console.error('Error fetching activity log stats:', error)
    return null
  }

  // RPC returns array with single row
  const stats = Array.isArray(data) ? data[0] : data

  return stats as ActivityLogStats
}

/**
 * Get unique users who have activity logs
 */
export async function getActivityUsers(): Promise<
  Array<{ id: string; email: string; name: string }>
> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('activity_logs')
    .select('user_id, user_email')
    .not('user_id', 'is', null)
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching activity users:', error)
    return []
  }

  // Get unique users
  const userMap = new Map<string, string>()
  ;(data || []).forEach((row) => {
    if (row.user_id && row.user_email && !userMap.has(row.user_id)) {
      userMap.set(row.user_id, row.user_email)
    }
  })

  return Array.from(userMap.entries()).map(([id, email]) => ({
    id,
    email,
    name: email.split('@')[0],
  }))
}

/**
 * Get error logs with severity info
 */
export async function getErrorLogs(
  limit = 50,
  from_date?: string
): Promise<ActivityLogWithUser[]> {
  const filters: ActivityLogFilters = {
    category: 'error',
    limit,
  }

  if (from_date) {
    filters.from_date = from_date
  }

  const { data } = await getActivityLogs(filters)
  return data
}

/**
 * Export activity logs in specified format
 */
export async function exportActivityLogs(
  filters: ActivityLogFilters,
  format: 'csv' | 'json' | 'jsonl'
): Promise<string> {
  // Get all matching logs (override limit)
  const { data } = await getActivityLogs({ ...filters, limit: 10000, offset: 0 })

  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2)

    case 'jsonl':
      return data.map((log) => JSON.stringify(log)).join('\n')

    case 'csv': {
      const headers = [
        'timestamp',
        'user_email',
        'action',
        'category',
        'entity_type',
        'entity_name',
        'ip_address',
        'browser',
        'duration_ms',
      ]

      const rows = data.map((log) =>
        headers
          .map((h) => {
            const val = log[h as keyof typeof log]
            if (val === null || val === undefined) return ''
            if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`
            return String(val)
          })
          .join(',')
      )

      return [headers.join(','), ...rows].join('\n')
    }

    default:
      return JSON.stringify(data)
  }
}

/**
 * Activity trend data point for sparklines
 */
export interface ActivityTrendPoint {
  date: string
  count: number
}

/**
 * Get activity trend for sparkline visualization
 * Aggregates activity counts by day for the specified period
 */
export async function getActivityTrend(options: {
  entity_type?: string
  entity_id?: string
  user_id?: string
  days?: number
}): Promise<ActivityTrendPoint[]> {
  const supabase = createAdminClient()
  const { entity_type, entity_id, user_id, days = 30 } = options

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  let query = supabase
    .from('activity_logs')
    .select('timestamp')
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())

  if (entity_type) {
    query = query.eq('entity_type', entity_type)
  }
  if (entity_id) {
    query = query.eq('entity_id', entity_id)
  }
  if (user_id) {
    query = query.eq('user_id', user_id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching activity trend:', error)
    return []
  }

  // Group by date
  const countByDate = new Map<string, number>()

  // Initialize all dates with 0
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    countByDate.set(dateStr, 0)
  }

  // Count activities per day
  ;(data || []).forEach((log) => {
    const dateStr = new Date(log.timestamp).toISOString().split('T')[0]
    countByDate.set(dateStr, (countByDate.get(dateStr) || 0) + 1)
  })

  // Convert to array sorted by date
  return Array.from(countByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))
}

/**
 * Get activity trends for multiple entities at once (batch)
 */
export async function getActivityTrendsBatch(
  entities: Array<{ entity_type: string; entity_id: string }>,
  days = 14
): Promise<Map<string, ActivityTrendPoint[]>> {
  const supabase = createAdminClient()

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Fetch all activity logs for the entities in one query
  const { data, error } = await supabase
    .from('activity_logs')
    .select('entity_type, entity_id, timestamp')
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())
    .in(
      'entity_id',
      entities.map((e) => e.entity_id)
    )

  if (error) {
    console.error('Error fetching activity trends batch:', error)
    return new Map()
  }

  // Group by entity and date
  const entityTrends = new Map<string, Map<string, number>>()

  // Initialize all entities with empty date maps
  entities.forEach(({ entity_type, entity_id }) => {
    const key = `${entity_type}:${entity_id}`
    const dateMap = new Map<string, number>()

    // Initialize all dates with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      dateMap.set(dateStr, 0)
    }

    entityTrends.set(key, dateMap)
  })

  // Count activities per entity per day
  ;(data || []).forEach((log) => {
    const key = `${log.entity_type}:${log.entity_id}`
    const dateMap = entityTrends.get(key)
    if (dateMap) {
      const dateStr = new Date(log.timestamp).toISOString().split('T')[0]
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1)
    }
  })

  // Convert to result format
  const result = new Map<string, ActivityTrendPoint[]>()

  entityTrends.forEach((dateMap, key) => {
    result.set(
      key,
      Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }))
    )
  })

  return result
}

/**
 * Archive old activity logs
 */
export async function archiveOldLogs(
  daysToKeep = 90
): Promise<{ success: boolean; archivedCount: number }> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('archive_old_activity_logs', {
    days_to_keep: daysToKeep,
  })

  if (error) {
    console.error('Error archiving logs:', error)
    return { success: false, archivedCount: 0 }
  }

  return { success: true, archivedCount: data || 0 }
}

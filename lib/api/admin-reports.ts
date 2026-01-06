import { createClient } from '@/lib/supabase/server'

// Types
export interface DevTimeReport {
  dev_id: string
  dev_name: string
  dev_email: string
  total_minutes: number
  entries_count: number
  projects: {
    project_id: string
    project_name: string
    minutes: number
  }[]
}

export interface TimeEntryWithDetails {
  id: string
  deliverable_id: string
  user_id: string
  duration_minutes: number
  description: string | null
  entry_date: string
  is_manual: boolean
  created_at: string
  user: {
    id: string
    name: string
    email: string
  }
  deliverable: {
    id: string
    title: string
    project_id: string
    project: {
      id: string
      project_name: string
      client_name: string
    }
  }
}

export interface ProjectTimeReport {
  project_id: string
  project_name: string
  client_name: string
  total_minutes: number
  estimated_hours: number | null
  devs: {
    dev_id: string
    dev_name: string
    minutes: number
  }[]
}

/**
 * Get all time entries for admin (with filters)
 */
export async function getAllTimeEntries(params?: {
  startDate?: string
  endDate?: string
  devId?: string
  projectId?: string
  limit?: number
}): Promise<TimeEntryWithDetails[]> {
  const supabase = await createClient()

  let query = supabase
    .from('time_entries')
    .select(`
      *,
      user:profiles!user_id(id, name, email),
      deliverable:deliverables(
        id, title, project_id,
        project:projects(id, project_name, client_name)
      )
    `)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (params?.startDate) {
    query = query.gte('entry_date', params.startDate)
  }
  if (params?.endDate) {
    query = query.lte('entry_date', params.endDate)
  }
  if (params?.devId) {
    query = query.eq('user_id', params.devId)
  }
  if (params?.limit) {
    query = query.limit(params.limit)
  }

  const { data, error } = await query

  if (error) throw error

  // Filter by project if needed (requires join)
  let entries = (data || []).map(normalizeTimeEntry)
  if (params?.projectId) {
    entries = entries.filter(e => e.deliverable?.project?.id === params.projectId)
  }

  return entries
}

/**
 * Get time report grouped by dev
 */
export async function getDevTimeReports(params?: {
  startDate?: string
  endDate?: string
}): Promise<DevTimeReport[]> {
  const entries = await getAllTimeEntries(params)

  // Group by dev
  const devMap = new Map<string, DevTimeReport>()

  for (const entry of entries) {
    const dev = entry.user
    if (!dev) continue

    if (!devMap.has(dev.id)) {
      devMap.set(dev.id, {
        dev_id: dev.id,
        dev_name: dev.name,
        dev_email: dev.email,
        total_minutes: 0,
        entries_count: 0,
        projects: [],
      })
    }

    const report = devMap.get(dev.id)!
    report.total_minutes += entry.duration_minutes
    report.entries_count++

    // Track project breakdown
    const project = entry.deliverable?.project
    if (project) {
      const existingProject = report.projects.find(p => p.project_id === project.id)
      if (existingProject) {
        existingProject.minutes += entry.duration_minutes
      } else {
        report.projects.push({
          project_id: project.id,
          project_name: project.project_name,
          minutes: entry.duration_minutes,
        })
      }
    }
  }

  return Array.from(devMap.values()).sort((a, b) => b.total_minutes - a.total_minutes)
}

/**
 * Get time report grouped by project
 */
export async function getProjectTimeReports(params?: {
  startDate?: string
  endDate?: string
}): Promise<ProjectTimeReport[]> {
  const entries = await getAllTimeEntries(params)

  // Group by project
  const projectMap = new Map<string, ProjectTimeReport>()

  for (const entry of entries) {
    const project = entry.deliverable?.project
    if (!project) continue

    if (!projectMap.has(project.id)) {
      projectMap.set(project.id, {
        project_id: project.id,
        project_name: project.project_name,
        client_name: project.client_name,
        total_minutes: 0,
        estimated_hours: null, // Could be fetched separately
        devs: [],
      })
    }

    const report = projectMap.get(project.id)!
    report.total_minutes += entry.duration_minutes

    // Track dev breakdown
    const dev = entry.user
    if (dev) {
      const existingDev = report.devs.find(d => d.dev_id === dev.id)
      if (existingDev) {
        existingDev.minutes += entry.duration_minutes
      } else {
        report.devs.push({
          dev_id: dev.id,
          dev_name: dev.name,
          minutes: entry.duration_minutes,
        })
      }
    }
  }

  return Array.from(projectMap.values()).sort((a, b) => b.total_minutes - a.total_minutes)
}

/**
 * Get all devs with their roles
 */
export async function getAllDevs(): Promise<{ id: string; name: string; email: string }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'dev')
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Get time summary stats for dashboard
 */
export async function getTimeSummaryStats(): Promise<{
  today_total: number
  week_total: number
  month_total: number
  active_devs: number
}> {
  const supabase = await createClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Week start (Monday)
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + mondayOffset)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  // Month start
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthStartStr = monthStart.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('time_entries')
    .select('duration_minutes, entry_date, user_id')
    .gte('entry_date', monthStartStr)

  if (error) throw error

  let today_total = 0
  let week_total = 0
  let month_total = 0
  const activeDevs = new Set<string>()

  for (const entry of data || []) {
    month_total += entry.duration_minutes
    activeDevs.add(entry.user_id)

    if (entry.entry_date === today) {
      today_total += entry.duration_minutes
    }
    if (entry.entry_date >= weekStartStr) {
      week_total += entry.duration_minutes
    }
  }

  return {
    today_total,
    week_total,
    month_total,
    active_devs: activeDevs.size,
  }
}

// Helper
function normalizeTimeEntry(entry: Record<string, unknown>): TimeEntryWithDetails {
  const user = Array.isArray(entry.user) ? entry.user[0] : entry.user
  let deliverable = Array.isArray(entry.deliverable) ? entry.deliverable[0] : entry.deliverable

  if (deliverable && typeof deliverable === 'object' && 'project' in deliverable) {
    const project = Array.isArray(deliverable.project) ? deliverable.project[0] : deliverable.project
    deliverable = { ...deliverable, project }
  }

  return { ...entry, user, deliverable } as TimeEntryWithDetails
}

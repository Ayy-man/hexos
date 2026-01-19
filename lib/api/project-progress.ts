import { createClient } from '@/lib/supabase/server'

// Types
export interface ProjectProgress {
  expected_progress_pct: number
  actual_progress_pct: number
  variance_pct: number
  is_at_risk: boolean
  client_delay_days: number
  dev_delay_days: number
  total_deliverables: number
  effective_working_days: number
}

export interface DeliverableProgress {
  id: string
  title: string
  hill_position: number
  status: string
  parent_id: string | null
}

// Get calculated progress for a project
export async function getProjectProgress(projectId: string): Promise<ProjectProgress> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('calculate_expected_progress', {
    p_project_id: projectId,
  })

  if (error) throw error

  const progress = data?.[0] || {
    expected_progress_pct: 0,
    actual_progress_pct: 0,
    variance_pct: 0,
    is_at_risk: false,
    client_delay_days: 0,
    dev_delay_days: 0,
    total_deliverables: 0,
    effective_working_days: 0,
  }

  return progress as ProjectProgress
}

// Get deliverable progress breakdown
export async function getDeliverableProgress(projectId: string): Promise<DeliverableProgress[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverables')
    .select('id, title, hill_position, status, parent_id')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error

  return (data || []).map((d) => ({
    id: d.id,
    title: d.title,
    hill_position: d.hill_position ?? 0,
    status: d.status,
    parent_id: d.parent_id,
  }))
}

// Get progress timeline (for charts)
export async function getProgressTimeline(
  projectId: string,
  days: number = 30
): Promise<Array<{ date: string; actual_pct: number; expected_pct: number }>> {
  const supabase = await createClient()

  // Get project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('started_at, target_delivery_date')
    .eq('id', projectId)
    .single()

  if (projectError) throw projectError
  if (!project?.started_at || !project?.target_delivery_date) {
    return []
  }

  // Get deliverable position history
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: history, error: historyError } = await supabase
    .from('deliverable_position_history')
    .select(`
      position,
      created_at,
      deliverable:deliverables!deliverable_id(project_id)
    `)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  if (historyError) throw historyError

  // Filter to this project only
  const projectHistory = (history || []).filter((h) => {
    const deliv = Array.isArray(h.deliverable) ? h.deliverable[0] : h.deliverable
    return deliv?.project_id === projectId
  })

  // Get total deliverables count for calculating percentages
  const { count } = await supabase
    .from('deliverables')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .not('parent_id', 'is', null)

  const totalDeliverables = count || 1
  const totalWork = totalDeliverables * 100

  // Group by date and calculate daily progress
  const dailyProgress = new Map<string, number>()
  let runningTotal = 0

  for (const h of projectHistory) {
    const date = new Date(h.created_at).toISOString().split('T')[0]
    runningTotal = h.position // Simplified: would need full recalc for accuracy
    dailyProgress.set(date, runningTotal)
  }

  // Build timeline with expected progress
  const timeline: Array<{ date: string; actual_pct: number; expected_pct: number }> = []
  const projectStart = new Date(project.started_at)
  const projectEnd = new Date(project.target_delivery_date)
  const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))

  const currentDate = new Date(startDate)
  while (currentDate <= new Date()) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const daysSinceStart = Math.ceil(
      (currentDate.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
    )

    const expectedPct = totalDays > 0 ? Math.min(100, (daysSinceStart / totalDays) * 100) : 0
    const actualPct = dailyProgress.get(dateStr) || 0

    timeline.push({
      date: dateStr,
      actual_pct: Math.round(actualPct * 10) / 10,
      expected_pct: Math.round(expectedPct * 10) / 10,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return timeline
}

// Check if project is at risk
export async function isProjectAtRisk(projectId: string): Promise<boolean> {
  const progress = await getProjectProgress(projectId)
  return progress.is_at_risk
}

// Get projects at risk (for admin dashboard)
export async function getProjectsAtRisk(): Promise<Array<{ id: string; name: string; variance: number }>> {
  const supabase = await createClient()

  // Get all active projects
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, project_name')
    .not('status', 'in', '(completed,cancelled,on_hold)')
    .not('started_at', 'is', null)
    .not('target_delivery_date', 'is', null)

  if (error) throw error

  const atRiskProjects: Array<{ id: string; name: string; variance: number }> = []

  for (const project of projects || []) {
    const progress = await getProjectProgress(project.id)
    if (progress.is_at_risk) {
      atRiskProjects.push({
        id: project.id,
        name: project.project_name,
        variance: progress.variance_pct,
      })
    }
  }

  // Sort by variance (most behind first)
  return atRiskProjects.sort((a, b) => a.variance - b.variance)
}

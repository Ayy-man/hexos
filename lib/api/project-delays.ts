import { createClient } from '@/lib/supabase/server'

// Types
export type DelayType = 'client_delay' | 'dev_delay'

export interface ProjectDelay {
  id: string
  project_id: string
  delay_type: DelayType
  delay_date: string
  days_count: number
  deliverable_id: string | null
  blocker_id: string | null
  reason: string
  marked_by: string | null
  created_at: string
  deliverable?: {
    id: string
    title: string
  } | null
  blocker?: {
    id: string
    title: string
  } | null
  marked_by_user?: {
    id: string
    name: string
  } | null
}

export interface CreateDelayInput {
  project_id: string
  delay_type: DelayType
  delay_date: string
  days_count?: number
  deliverable_id?: string
  blocker_id?: string
  reason: string
}

export interface UpdateDelayInput {
  delay_date?: string
  days_count?: number
  reason?: string
}

export interface DelaySummary {
  client_delay_days: number
  dev_delay_days: number
  total_delay_days: number
}

// Get all delays for a project
export async function getProjectDelays(projectId: string): Promise<ProjectDelay[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_delays')
    .select(`
      *,
      deliverable:deliverables!deliverable_id(id, title),
      blocker:blockers!blocker_id(id, title),
      marked_by_user:profiles!marked_by(id, name)
    `)
    .eq('project_id', projectId)
    .order('delay_date', { ascending: false })

  if (error) throw error
  return data as ProjectDelay[]
}

// Get delay summary for a project
export async function getDelaySummary(projectId: string): Promise<DelaySummary> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_delays')
    .select('delay_type, days_count')
    .eq('project_id', projectId)

  if (error) throw error

  const summary: DelaySummary = {
    client_delay_days: 0,
    dev_delay_days: 0,
    total_delay_days: 0,
  }

  for (const delay of data || []) {
    if (delay.delay_type === 'client_delay') {
      summary.client_delay_days += delay.days_count
    } else {
      summary.dev_delay_days += delay.days_count
    }
    summary.total_delay_days += delay.days_count
  }

  return summary
}

// Create a delay
export async function createDelay(input: CreateDelayInput): Promise<ProjectDelay> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('project_delays')
    .insert({
      ...input,
      days_count: input.days_count ?? 1,
      marked_by: user?.id || null,
    })
    .select(`
      *,
      deliverable:deliverables!deliverable_id(id, title),
      blocker:blockers!blocker_id(id, title),
      marked_by_user:profiles!marked_by(id, name)
    `)
    .single()

  if (error) throw error
  return data as ProjectDelay
}

// Update a delay
export async function updateDelay(id: string, input: UpdateDelayInput): Promise<ProjectDelay> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_delays')
    .update(input)
    .eq('id', id)
    .select(`
      *,
      deliverable:deliverables!deliverable_id(id, title),
      blocker:blockers!blocker_id(id, title),
      marked_by_user:profiles!marked_by(id, name)
    `)
    .single()

  if (error) throw error
  return data as ProjectDelay
}

// Delete a delay
export async function deleteDelay(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('project_delays')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Get delays by type
export async function getDelaysByType(
  projectId: string,
  delayType: DelayType
): Promise<ProjectDelay[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_delays')
    .select(`
      *,
      deliverable:deliverables!deliverable_id(id, title),
      blocker:blockers!blocker_id(id, title),
      marked_by_user:profiles!marked_by(id, name)
    `)
    .eq('project_id', projectId)
    .eq('delay_type', delayType)
    .order('delay_date', { ascending: false })

  if (error) throw error
  return data as ProjectDelay[]
}

// Get recent delays (last 30 days)
export async function getRecentDelays(projectId: string): Promise<ProjectDelay[]> {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('project_delays')
    .select(`
      *,
      deliverable:deliverables!deliverable_id(id, title),
      blocker:blockers!blocker_id(id, title),
      marked_by_user:profiles!marked_by(id, name)
    `)
    .eq('project_id', projectId)
    .gte('delay_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('delay_date', { ascending: false })

  if (error) throw error
  return data as ProjectDelay[]
}

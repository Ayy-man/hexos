import { createClient } from '@/lib/supabase/server'

// Types
export type ExtensionStatus = 'pending' | 'approved' | 'rejected'

export interface ProjectExtension {
  id: string
  project_id: string
  status: ExtensionStatus
  original_deadline: string
  requested_deadline: string
  client_delay_days: number
  additional_days: number
  reason: string
  requested_by: string | null
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  requester?: {
    id: string
    name: string
  } | null
  reviewer?: {
    id: string
    name: string
  } | null
  project?: {
    id: string
    project_name: string
  } | null
}

export interface CreateExtensionInput {
  project_id: string
  original_deadline: string
  requested_deadline: string
  client_delay_days?: number
  additional_days?: number
  reason: string
}

export interface ReviewExtensionInput {
  status: 'approved' | 'rejected'
  review_notes?: string
}

// Get all extensions for a project
export async function getProjectExtensions(projectId: string): Promise<ProjectExtension[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_extensions')
    .select('*')
    .eq('project_id', projectId)
    .order('requested_at', { ascending: false })

  if (error) throw error
  return data as ProjectExtension[]
}

// Get pending extensions (for DFY approval dashboard)
export async function getPendingExtensions(): Promise<ProjectExtension[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_extensions')
    .select(`
      *,
      project:projects(id, project_name)
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  if (error) throw error
  return data as ProjectExtension[]
}

// Get a single extension
export async function getExtension(id: string): Promise<ProjectExtension> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_extensions')
    .select(`
      *,
      project:projects(id, project_name)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as ProjectExtension
}

// Create an extension request
export async function createExtension(input: CreateExtensionInput): Promise<ProjectExtension> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Auto-calculate client delay days if not provided
  let clientDelayDays = input.client_delay_days ?? 0
  if (clientDelayDays === 0) {
    const { data: clientDelays } = await supabase.rpc('get_client_delay_days', {
      p_project_id: input.project_id,
    })
    clientDelayDays = clientDelays || 0
  }

  // Calculate additional days
  const originalDate = new Date(input.original_deadline)
  const requestedDate = new Date(input.requested_deadline)
  const totalExtensionDays = Math.ceil(
    (requestedDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const additionalDays = input.additional_days ?? Math.max(0, totalExtensionDays - clientDelayDays)

  const { data, error } = await supabase
    .from('project_extensions')
    .insert({
      project_id: input.project_id,
      original_deadline: input.original_deadline,
      requested_deadline: input.requested_deadline,
      client_delay_days: clientDelayDays,
      additional_days: additionalDays,
      reason: input.reason,
      requested_by: user?.id || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as ProjectExtension
}

// Review an extension (approve/reject)
export async function reviewExtension(
  id: string,
  input: ReviewExtensionInput
): Promise<ProjectExtension> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('project_extensions')
    .update({
      status: input.status,
      review_notes: input.review_notes || null,
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as ProjectExtension
}

// Approve an extension (convenience method)
export async function approveExtension(
  id: string,
  notes?: string
): Promise<ProjectExtension> {
  return reviewExtension(id, { status: 'approved', review_notes: notes })
}

// Reject an extension (convenience method)
export async function rejectExtension(
  id: string,
  notes?: string
): Promise<ProjectExtension> {
  return reviewExtension(id, { status: 'rejected', review_notes: notes })
}

// Get extension history for a project
export async function getExtensionHistory(projectId: string): Promise<ProjectExtension[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_extensions')
    .select('*')
    .eq('project_id', projectId)
    .neq('status', 'pending')
    .order('reviewed_at', { ascending: false })

  if (error) throw error
  return data as ProjectExtension[]
}

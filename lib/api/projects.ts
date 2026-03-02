import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/auth/types'
import type { OnboardingRequirement } from './onboarding-requirements'
export type { Deliverable } from './deliverables'

// Project statuses (23 total) - starts at sign-off phase after conversion from inquiry
// Inquiry/proposal phases are handled at the inquiry level (proposal_stage)
export type ProjectStatus =
  // Sign-off
  | 'deliverables_pending' | 'awaiting_signoff' | 'signed_off'
  // Agreement
  | 'agreement_sent' | 'agreement_signed'
  // Payment
  | 'payment_pending' | 'payment_partial' | 'payment_paid'
  // Onboarding
  | 'collecting_access' | 'access_complete' | 'dev_assigned'
  // Development
  | 'in_progress' | 'blocked_client' | 'blocked_internal' | 'review_checkpoint' | 'revisions' | 'final_qa'
  // Delivery
  | 'delivered' | 'acceptance_pending' | 'accepted'
  // Retainer
  | 'retainer'
  // Closed
  | 'completed' | 'cancelled' | 'on_hold'

export interface Project {
  id: string
  project_name: string
  client_name: string
  client_email: string | null
  client_business: string | null
  status: ProjectStatus
  project_type: string | null
  operational_mode: string
  blueprint_match_score: number | null
  matched_blueprint_id: string | null
  price_dfy: number | null
  price_hexona: number | null
  price_dev: number | null
  retainer_plan: 'one_time' | 'monthly' | 'quarterly' | 'annual'
  retainer_date: string | null
  software_payer: 'hexona' | 'client'
  date_inquiry: string | null
  date_proposal_sent: string | null
  date_closed: string | null
  date_onboarding: string | null
  date_delivered: string | null
  dfy_commission_pct: number | null
  payment_structure: string
  created_at: string
  updated_at: string
  proposal_sent_at: string | null
  started_at: string | null
  target_delivery_date: string | null
  delivered_at: string | null
  notes: string | null
  dfy_partner_id: string | null
  assigned_dev_id: string | null
  client_id: string | null

  // Inquiry link
  source_inquiry_id: string | null

  // Sign-off tracking
  deliverables_confirmed_at: string | null
  deliverables_confirmed_by: string | null
  signoff_sent_at: string | null
  signoff_sent_by: string | null
  signed_off_at: string | null
  signed_off_by: string | null

  // Delivery estimate override
  delivery_date_override: string | null

  // Retainer config
  check_in_cadence: 'weekly' | 'biweekly' | 'monthly' | null
  check_in_assignees: string[] | null
  retainer_dev_ids: string[] | null
  completion_summary: Record<string, unknown> | null
  completed_at: string | null
  retainer_started_at: string | null

  // Soft delete/archive fields
  archived_at: string | null
  archived_by: string | null
  deleted_at: string | null
  deleted_by: string | null
}

export interface ProjectWithRelations extends Project {
  dfy_partner?: { id: string; name: string; email: string } | null
  assigned_dev?: { id: string; name: string; email: string } | null
  client?: { id: string; name: string; email: string } | null
  deliverables?: Array<{
    id: string
    title: string
    description: string | null
    status: string
    estimated_hours: number | null
    start_date: string | null
    due_date: string | null
    completed_at: string | null
    sort_order: number
    // Hierarchy support
    parent_id: string | null
    // Hill chart support
    hill_position: number
    hill_color: string | null
  }>
  requirements?: OnboardingRequirement[]
  files?: Array<{
    id: string
    project_id: string
    parent_id: string | null
    file_name: string
    file_path: string
    file_size: number | null
    file_type: string | null
    content_type: 'file' | 'folder' | 'document'
    content: unknown | null
    visibility: 'internal' | 'client'
    shared_to: 'internal' | 'client' | null
    description: string | null
    position: number
    uploaded_by: string | null
    uploaded_at: string
    uploader?: { id: string; name: string } | null
  }>
  activity?: Array<{
    id: string
    action: string
    details: Record<string, unknown> | null
    created_at: string
    user?: { name: string } | null
  }>
}

export interface CreateProjectInput {
  project_name: string
  client_name: string
  client_email?: string
  client_business?: string
  project_type?: 'blueprint' | 'blueprint_custom' | 'full_custom'
  operational_mode?: 'internal' | 'hexona_devs' | 'hexona_devs_dfy'
  matched_blueprint_id?: string
  price_dfy?: number
  target_delivery_date?: string
  notes?: string
  dfy_partner_id?: string
  assigned_dev_id?: string
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  status?: string
  price_dfy?: number
  price_hexona?: number
  price_dev?: number
  retainer_plan?: 'one_time' | 'monthly' | 'quarterly' | 'annual'
  retainer_date?: string
  software_payer?: 'hexona' | 'client'
  date_inquiry?: string
  date_proposal_sent?: string
  date_closed?: string
  date_onboarding?: string
  date_delivered?: string
  dfy_commission_pct?: number
  payment_structure?: '100_upfront' | '50_50' | '40_30_30' | 'custom'
  check_in_cadence?: 'weekly' | 'biweekly' | 'monthly' | null
  check_in_assignees?: string[]
  retainer_dev_ids?: string[]
  completion_summary?: Record<string, unknown>
  completed_at?: string
  retainer_started_at?: string
}

// Get all projects (filtered by RLS based on user role)
export type ProjectFilter = 'active' | 'archived' | 'deleted' | 'all'

export async function getProjects(filter: ProjectFilter = 'active') {
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select(`
      *,
      dfy_partner:profiles!projects_dfy_partner_id_fkey(id, name, email),
      assigned_dev:profiles!projects_assigned_dev_id_fkey(id, name, email),
      client:profiles!projects_client_id_fkey(id, name, email),
      deliverables(id, title, status, due_date, parent_id, hill_position),
      requirements:onboarding_requirements(id, status)
    `)

  // Apply filters based on archive/delete status
  if (filter === 'active') {
    query = query.is('deleted_at', null).is('archived_at', null)
  } else if (filter === 'archived') {
    query = query.is('deleted_at', null).not('archived_at', 'is', null)
  } else if (filter === 'deleted') {
    query = query.not('deleted_at', 'is', null)
  }
  // 'all' shows everything including deleted

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data as ProjectWithRelations[]
}

// Get single project by ID with all relations
export async function getProject(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      dfy_partner:profiles!projects_dfy_partner_id_fkey(id, name, email),
      assigned_dev:profiles!projects_assigned_dev_id_fkey(id, name, email),
      client:profiles!projects_client_id_fkey(id, name, email),
      deliverables(id, title, description, status, estimated_hours, start_date, due_date, completed_at, sort_order, parent_id, hill_position, hill_color, position_history:deliverable_position_history(id, position, created_at, created_by, note)),
      requirements:onboarding_requirements(id, project_id, parent_id, title, description, notes, owner_type, blocker_type, status, loom_url, resource_url, position, created_at, updated_at, completed_at, completed_by),
      files:project_files(id, project_id, parent_id, file_name, file_path, file_size, file_type, content_type, content, visibility, shared_to, description, position, uploaded_by, uploaded_at, uploader:profiles!uploaded_by(id, name)),
      activity:activity_log(id, action, details, created_at, user:profiles(name))
    `)
    .eq('id', id)
    .order('sort_order', { referencedTable: 'deliverables', ascending: true })
    .order('position', { referencedTable: 'onboarding_requirements', ascending: true })
    .order('position', { referencedTable: 'project_files', ascending: true })
    .order('created_at', { referencedTable: 'activity_log', ascending: false })
    .single()

  if (error) throw error
  return data as ProjectWithRelations
}

// Create new project (admin/internal only via RLS)
// Also creates a default "Gameplan" document for the project
export async function createProject(input: CreateProjectInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .insert(input)
    .select()
    .single()

  if (error) throw error

  const project = data as Project

  // Auto-create default Gameplan document
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('project_documents').insert({
      project_id: project.id,
      title: 'Gameplan',
      slug: 'gameplan',
      content: [{ type: 'p', children: [{ text: '' }] }],
      visibility: 'internal',
      position: 0,
      created_by: user?.id || null,
    })
  } catch (docError) {
    // Log but don't fail project creation if document creation fails
    console.error('[createProject] Failed to create default Gameplan document:', docError)
  }

  return project
}

// Update project
export async function updateProject(id: string, input: UpdateProjectInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Project
}

// Delete project (admin only via RLS)
export async function deleteProject(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Get projects by status
export async function getProjectsByStatus(status: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', status)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Project[]
}

// Get available developers for assignment
export async function getAvailableDevs() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'dev')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

// Get project counts by status (for dashboard)
export async function getProjectStats() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('status')

  if (error) throw error

  const stats = {
    total: data.length,
    inquiry: 0,
    active: 0,
    completed: 0,
  }

  const inquiryStatuses = ['inquiry_new', 'ai_matching', 'qualified']
  const completedStatuses = ['completed', 'cancelled', 'on_hold']

  data.forEach((p) => {
    if (inquiryStatuses.includes(p.status)) {
      stats.inquiry++
    } else if (completedStatuses.includes(p.status)) {
      stats.completed++
    } else {
      stats.active++
    }
  })

  return stats
}

// Get projects by status group (for sidebar hover drill-down)
export async function getProjectsByStatusGroup(group: 'active' | 'inquiry' | 'completed', limit = 5) {
  const supabase = await createClient()
  const statusMap: Record<string, string[]> = {
    active: ['in_progress', 'blocked_client', 'blocked_internal', 'review_checkpoint', 'revisions', 'final_qa'],
    inquiry: ['deliverables_pending', 'awaiting_signoff', 'signed_off', 'agreement_sent', 'agreement_signed', 'payment_pending', 'payment_partial', 'payment_paid', 'collecting_access', 'access_complete', 'dev_assigned'],
    completed: ['completed', 'cancelled', 'on_hold'],
  }
  const { data } = await supabase
    .from('projects')
    .select('id, project_name, client_name, status')
    .in('status', statusMap[group] || [])
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit)
  return data || []
}

// ============================================================================
// FINANCIAL FIELDS
// ============================================================================

// Re-export from utility file (safe for client components)
export { computeProjectFinancials, type ProjectFinancials } from '@/lib/utils/projectFinancials'

export interface UpdateProjectFinancialsInput {
  price_dfy?: number | null
  price_hexona?: number | null
  price_dev?: number | null
  retainer_plan?: 'one_time' | 'monthly' | 'quarterly' | 'annual'
  retainer_date?: string | null
  software_payer?: 'hexona' | 'client'
  date_inquiry?: string | null
  date_proposal_sent?: string | null
  date_closed?: string | null
  date_onboarding?: string | null
  date_delivered?: string | null
}

// Update project financial fields (admin only)
export async function updateProjectFinancials(
  id: string,
  input: UpdateProjectFinancialsInput
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Project
}

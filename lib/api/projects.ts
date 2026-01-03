import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/auth/types'
import type { OnboardingRequirement } from './onboarding-requirements'

// All 30 project statuses
export type ProjectStatus =
  // Inquiry
  | 'inquiry_new' | 'ai_matching' | 'qualified'
  // Proposal
  | 'proposal_drafting' | 'internal_review' | 'proposal_sent' | 'negotiating' | 'committed'
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
}

// Get all projects (filtered by RLS based on user role)
export async function getProjects() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      dfy_partner:profiles!projects_dfy_partner_id_fkey(id, name, email),
      assigned_dev:profiles!projects_assigned_dev_id_fkey(id, name, email),
      client:profiles!projects_client_id_fkey(id, name, email)
    `)
    .order('created_at', { ascending: false })

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
      deliverables(id, title, description, status, estimated_hours, start_date, due_date, completed_at, sort_order),
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
export async function createProject(input: CreateProjectInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Project
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

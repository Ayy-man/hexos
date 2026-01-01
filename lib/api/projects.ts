import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/auth/types'
import type { ProjectRequirement } from './project-requirements'

export interface Project {
  id: string
  project_name: string
  client_name: string
  client_email: string | null
  client_business: string | null
  status: string
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
  requirements?: ProjectRequirement[]
  files?: Array<{
    id: string
    file_name: string
    file_path: string
    file_size: number | null
    file_type: string | null
    uploaded_by: string | null
    uploaded_at: string
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
      requirements:project_requirements(id, project_id, title, description, status, file_id, response, completed_at, completed_by, sort_order, created_at, assigned_role, assigned_to),
      files:project_files(id, file_name, file_path, file_size, file_type, uploaded_by, uploaded_at),
      activity:activity_log(id, action, details, created_at, user:profiles(name))
    `)
    .eq('id', id)
    .order('sort_order', { referencedTable: 'deliverables', ascending: true })
    .order('sort_order', { referencedTable: 'project_requirements', ascending: true })
    .order('uploaded_at', { referencedTable: 'project_files', ascending: false })
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

export interface ProjectFinancials {
  price_dfy: number | null
  price_hexona: number | null
  price_dev: number | null
  profit_hexona: number | null
  profit_dfy: number | null
  cycle_sales: number | null
  cycle_delivery: number | null
}

// Compute profit and cycle metrics from project data (API layer, not DB)
export function computeProjectFinancials(project: Project): ProjectFinancials {
  const profit_hexona =
    project.price_hexona != null && project.price_dev != null
      ? project.price_hexona - project.price_dev
      : null

  const profit_dfy =
    project.price_dfy != null && project.price_hexona != null
      ? project.price_dfy - project.price_hexona
      : null

  const cycle_sales =
    project.date_inquiry && project.date_closed
      ? Math.round(
          (new Date(project.date_closed).getTime() -
            new Date(project.date_inquiry).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null

  const cycle_delivery =
    project.date_closed && project.date_delivered
      ? Math.round(
          (new Date(project.date_delivered).getTime() -
            new Date(project.date_closed).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null

  return {
    price_dfy: project.price_dfy,
    price_hexona: project.price_hexona,
    price_dev: project.price_dev,
    profit_hexona,
    profit_dfy,
    cycle_sales,
    cycle_delivery,
  }
}

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

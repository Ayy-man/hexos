import { createClient } from '@/lib/supabase/server'

// Types
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'withdrawn'
export type OpportunityStatus = 'draft' | 'open' | 'filled' | 'closed'
export type ApplicationStatus = 'pending' | 'shortlisted' | 'accepted' | 'rejected'
export type ProjectComplexity = 'low' | 'medium' | 'high'

export interface ProjectOpportunity {
  id: string
  project_id: string | null
  title: string
  description: string | null
  requirements: string | null
  estimated_hours: number | null
  tech_stack: string[]
  complexity: ProjectComplexity
  deadline: string | null
  status: OpportunityStatus
  is_public: boolean
  required_skills: string[]
  created_by: string
  created_at: string
  published_at: string | null
  expires_at: string | null
  project?: {
    id: string
    project_name: string
    client_name: string
  }
  creator?: {
    id: string
    name: string
  }
  applications_count?: number
}

export interface DevOpportunityPreference {
  id: string
  dev_id: string
  opportunity_id: string
  is_starred: boolean
  is_hidden: boolean
  created_at: string
  updated_at: string
}

export interface OpportunityWithPrefs extends ProjectOpportunity {
  preference?: DevOpportunityPreference | null
  is_starred?: boolean
  is_hidden?: boolean
}

export interface ProjectInvitation {
  id: string
  opportunity_id: string | null
  project_id: string
  dev_id: string
  status: InvitationStatus
  message: string | null
  match_percentage: number | null
  response_message: string | null
  responded_at: string | null
  expires_at: string | null
  invited_by: string
  created_at: string
  project?: {
    id: string
    project_name: string
    client_name: string
  }
  opportunity?: ProjectOpportunity
  inviter?: {
    id: string
    name: string
  }
}

export interface ProjectApplication {
  id: string
  opportunity_id: string
  dev_id: string
  status: ApplicationStatus
  cover_message: string | null
  estimated_completion: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  dev?: {
    id: string
    name: string
    email: string
  }
  opportunity?: ProjectOpportunity
}

export interface DevAvailability {
  id: string
  dev_id: string
  is_available: boolean
  available_hours_per_week: number
  available_from: string | null
  preferred_complexity: ProjectComplexity[]
  preferred_project_types: string[]
  min_hours_per_project: number | null
  max_hours_per_project: number | null
  headline: string | null
  portfolio_url: string | null
  updated_at: string
  profile?: {
    id: string
    name: string
    email: string
  }
}

// ============================================================================
// OPPORTUNITIES
// ============================================================================

/**
 * Get public open opportunities
 */
export async function getPublicOpportunities(): Promise<ProjectOpportunity[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_opportunities')
    .select(`
      *,
      project:projects(id, project_name, client_name),
      creator:profiles!created_by(id, name)
    `)
    .eq('is_public', true)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeOpportunityRelations)
}

/**
 * Get all opportunities (admin)
 */
export async function getAllOpportunities(): Promise<ProjectOpportunity[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_opportunities')
    .select(`
      *,
      project:projects(id, project_name, client_name),
      creator:profiles!created_by(id, name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeOpportunityRelations)
}

/**
 * Get opportunity by ID
 */
export async function getOpportunity(opportunityId: string): Promise<ProjectOpportunity | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_opportunities')
    .select(`
      *,
      project:projects(id, project_name, client_name),
      creator:profiles!created_by(id, name)
    `)
    .eq('id', opportunityId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null

  return normalizeOpportunityRelations(data)
}

/**
 * Create a new opportunity
 */
export async function createOpportunity(params: {
  projectId?: string
  title: string
  description?: string
  requirements?: string
  estimatedHours?: number
  techStack?: string[]
  complexity?: ProjectComplexity
  deadline?: string
  expiresAt?: string
  isPublic?: boolean
  requiredSkills?: string[]
}): Promise<ProjectOpportunity> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('project_opportunities')
    .insert({
      project_id: params.projectId || null,
      title: params.title,
      description: params.description || null,
      requirements: params.requirements || null,
      estimated_hours: params.estimatedHours || null,
      tech_stack: params.techStack || [],
      complexity: params.complexity || 'medium',
      deadline: params.deadline || null,
      expires_at: params.expiresAt || null,
      is_public: params.isPublic || false,
      required_skills: params.requiredSkills || [],
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data as ProjectOpportunity
}

/**
 * Publish an opportunity
 */
export async function publishOpportunity(opportunityId: string): Promise<ProjectOpportunity> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_opportunities')
    .update({
      status: 'open',
      published_at: new Date().toISOString(),
    })
    .eq('id', opportunityId)
    .select()
    .single()

  if (error) throw error
  return data as ProjectOpportunity
}

/**
 * Close an opportunity
 */
export async function closeOpportunity(opportunityId: string, filled: boolean = false): Promise<ProjectOpportunity> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_opportunities')
    .update({
      status: filled ? 'filled' : 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', opportunityId)
    .select()
    .single()

  if (error) throw error
  return data as ProjectOpportunity
}

// ============================================================================
// INVITATIONS
// ============================================================================

/**
 * Get pending invitations for current dev
 */
export async function getMyInvitations(): Promise<ProjectInvitation[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('project_invitations')
    .select(`
      *,
      project:projects(id, project_name, client_name),
      inviter:profiles!invited_by(id, name),
      opportunity:project_opportunities(*)
    `)
    .eq('dev_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeInvitationRelations)
}

/**
 * Get pending invitations only
 */
export async function getPendingInvitations(): Promise<ProjectInvitation[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('project_invitations')
    .select(`
      *,
      project:projects(id, project_name, client_name),
      inviter:profiles!invited_by(id, name),
      opportunity:project_opportunities(*)
    `)
    .eq('dev_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeInvitationRelations)
}

/**
 * Send invitation to a dev
 */
export async function sendInvitation(params: {
  projectId: string
  devId: string
  opportunityId?: string
  message?: string
  matchPercentage?: number
  expiresAt?: string
}): Promise<ProjectInvitation> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('project_invitations')
    .insert({
      project_id: params.projectId,
      dev_id: params.devId,
      opportunity_id: params.opportunityId || null,
      message: params.message || null,
      match_percentage: params.matchPercentage || null,
      expires_at: params.expiresAt || null,
      invited_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data as ProjectInvitation
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(invitationId: string, responseMessage?: string): Promise<ProjectInvitation> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_invitations')
    .update({
      status: 'accepted',
      response_message: responseMessage || null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .select()
    .single()

  if (error) throw error
  return data as ProjectInvitation
}

/**
 * Decline an invitation
 */
export async function declineInvitation(invitationId: string, responseMessage?: string): Promise<ProjectInvitation> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_invitations')
    .update({
      status: 'declined',
      response_message: responseMessage || null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .select()
    .single()

  if (error) throw error
  return data as ProjectInvitation
}

// ============================================================================
// APPLICATIONS
// ============================================================================

/**
 * Apply to an opportunity
 */
export async function applyToOpportunity(params: {
  opportunityId: string
  coverMessage?: string
  estimatedCompletion?: string
}): Promise<ProjectApplication> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('project_applications')
    .insert({
      opportunity_id: params.opportunityId,
      dev_id: user.id,
      cover_message: params.coverMessage || null,
      estimated_completion: params.estimatedCompletion || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as ProjectApplication
}

/**
 * Get my applications
 */
export async function getMyApplications(): Promise<ProjectApplication[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('project_applications')
    .select(`
      *,
      opportunity:project_opportunities(*)
    `)
    .eq('dev_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeApplicationRelations)
}

/**
 * Get applications for an opportunity (admin)
 */
export async function getApplicationsForOpportunity(opportunityId: string): Promise<ProjectApplication[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_applications')
    .select(`
      *,
      dev:profiles(id, name, email)
    `)
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeApplicationRelations)
}

/**
 * Update application status (admin)
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  notes?: string
): Promise<ProjectApplication> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('project_applications')
    .update({
      status,
      review_notes: notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single()

  if (error) throw error
  return data as ProjectApplication
}

// ============================================================================
// DEV AVAILABILITY
// ============================================================================

/**
 * Get available devs (admin)
 */
export async function getAvailableDevs(): Promise<DevAvailability[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dev_availability')
    .select(`
      *,
      profile:profiles(id, name, email)
    `)
    .eq('is_available', true)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeAvailabilityRelations)
}

/**
 * Get my availability settings
 */
export async function getMyAvailability(): Promise<DevAvailability | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('dev_availability')
    .select('*')
    .eq('dev_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as DevAvailability | null
}

/**
 * Update my availability
 */
export async function updateMyAvailability(updates: {
  is_available?: boolean
  available_hours_per_week?: number
  available_from?: string
  preferred_complexity?: ProjectComplexity[]
  preferred_project_types?: string[]
  min_hours_per_project?: number
  max_hours_per_project?: number
  headline?: string
  portfolio_url?: string
}): Promise<DevAvailability> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('dev_availability')
    .upsert({
      dev_id: user.id,
      ...updates,
    })
    .select()
    .single()

  if (error) throw error
  return data as DevAvailability
}

// ============================================================================
// DEV OPPORTUNITY PREFERENCES
// ============================================================================

/**
 * Get opportunities for dev with their preferences (starred/hidden status)
 */
export async function getOpportunitiesForDev(): Promise<OpportunityWithPrefs[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  // Get all visible opportunities (public + open, or invited)
  const { data: opportunities, error: oppError } = await supabase
    .from('project_opportunities')
    .select(`
      *,
      project:projects(id, project_name, client_name),
      creator:profiles!created_by(id, name)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (oppError) throw oppError

  // Get dev's preferences
  const { data: preferences, error: prefError } = await supabase
    .from('dev_opportunity_preferences')
    .select('*')
    .eq('dev_id', user.id)

  if (prefError) throw prefError

  // Merge preferences with opportunities
  const prefMap = new Map(preferences?.map(p => [p.opportunity_id, p]) || [])

  return (opportunities || []).map(opp => {
    const normalized = normalizeOpportunityRelations(opp)
    const pref = prefMap.get(opp.id)
    return {
      ...normalized,
      preference: pref || null,
      is_starred: pref?.is_starred || false,
      is_hidden: pref?.is_hidden || false,
    } as OpportunityWithPrefs
  })
}

/**
 * Toggle star status for an opportunity
 */
export async function toggleOpportunityStar(opportunityId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Check if preference exists
  const { data: existing } = await supabase
    .from('dev_opportunity_preferences')
    .select('*')
    .eq('dev_id', user.id)
    .eq('opportunity_id', opportunityId)
    .single()

  if (existing) {
    // Toggle existing
    const { error } = await supabase
      .from('dev_opportunity_preferences')
      .update({ is_starred: !existing.is_starred })
      .eq('id', existing.id)

    if (error) throw error
    return !existing.is_starred
  } else {
    // Create new with starred = true
    const { error } = await supabase
      .from('dev_opportunity_preferences')
      .insert({
        dev_id: user.id,
        opportunity_id: opportunityId,
        is_starred: true,
        is_hidden: false,
      })

    if (error) throw error
    return true
  }
}

/**
 * Toggle hide status for an opportunity
 */
export async function toggleOpportunityHide(opportunityId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Check if preference exists
  const { data: existing } = await supabase
    .from('dev_opportunity_preferences')
    .select('*')
    .eq('dev_id', user.id)
    .eq('opportunity_id', opportunityId)
    .single()

  if (existing) {
    // Toggle existing
    const { error } = await supabase
      .from('dev_opportunity_preferences')
      .update({ is_hidden: !existing.is_hidden })
      .eq('id', existing.id)

    if (error) throw error
    return !existing.is_hidden
  } else {
    // Create new with hidden = true
    const { error } = await supabase
      .from('dev_opportunity_preferences')
      .insert({
        dev_id: user.id,
        opportunity_id: opportunityId,
        is_starred: false,
        is_hidden: true,
      })

    if (error) throw error
    return true
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeOpportunityRelations(opp: Record<string, unknown>): ProjectOpportunity {
  const project = Array.isArray(opp.project) ? opp.project[0] : opp.project
  const creator = Array.isArray(opp.creator) ? opp.creator[0] : opp.creator

  return { ...opp, project, creator } as ProjectOpportunity
}

function normalizeInvitationRelations(inv: Record<string, unknown>): ProjectInvitation {
  const project = Array.isArray(inv.project) ? inv.project[0] : inv.project
  const inviter = Array.isArray(inv.inviter) ? inv.inviter[0] : inv.inviter
  const opportunity = Array.isArray(inv.opportunity) ? inv.opportunity[0] : inv.opportunity

  return { ...inv, project, inviter, opportunity } as ProjectInvitation
}

function normalizeApplicationRelations(app: Record<string, unknown>): ProjectApplication {
  const dev = Array.isArray(app.dev) ? app.dev[0] : app.dev
  const opportunity = Array.isArray(app.opportunity) ? app.opportunity[0] : app.opportunity

  return { ...app, dev, opportunity } as ProjectApplication
}

function normalizeAvailabilityRelations(avail: Record<string, unknown>): DevAvailability {
  const profile = Array.isArray(avail.profile) ? avail.profile[0] : avail.profile

  return { ...avail, profile } as DevAvailability
}

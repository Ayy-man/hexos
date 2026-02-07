import { createClient } from '@/lib/supabase/server'

// Re-export types and pure functions from opportunity-types.ts for backward compatibility
// Client components should import directly from @/lib/api/opportunity-types to avoid server imports
export type {
  InvitationStatus,
  OpportunityStatus,
  ApplicationStatus,
  ProjectComplexity,
  CommitmentStatus,
  ProjectOpportunity,
  DevOpportunityPreference,
  OpportunityWithPrefs,
  DevAvailability,
  ProjectInvitation,
  ProjectApplication,
} from './opportunity-types'

export { formatDuration } from './opportunity-types'

// Import types for use in this file
import type {
  InvitationStatus,
  ApplicationStatus,
  ProjectComplexity,
  CommitmentStatus,
  ProjectOpportunity,
  DevOpportunityPreference,
  OpportunityWithPrefs,
  DevAvailability,
  ProjectInvitation,
  ProjectApplication,
} from './opportunity-types'

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
      creator:profiles!created_by(id, name),
      bids:dev_opportunity_bids(count)
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
      creator:profiles!created_by(id, name),
      bids:dev_opportunity_bids(count)
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
      creator:profiles!created_by(id, name),
      bids:dev_opportunity_bids(count)
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
  estimatedWeeks?: number
  estimatedHoursMin?: number
  estimatedHoursMax?: number
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
      estimated_weeks: params.estimatedWeeks || null,
      estimated_hours_min: params.estimatedHoursMin || null,
      estimated_hours_max: params.estimatedHoursMax || null,
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
      creator:profiles!created_by(id, name),
      bids:dev_opportunity_bids(count)
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
      commitment_status: pref?.commitment_status || null,
      committed_at: pref?.committed_at || null,
      commitment_note: pref?.commitment_note || null,
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
// COMMITMENT STATUS
// ============================================================================

/**
 * Update commitment status for an opportunity
 */
export async function updateCommitmentStatus(
  opportunityId: string,
  status: CommitmentStatus,
  note?: string
): Promise<DevOpportunityPreference> {
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

  const updateData = {
    commitment_status: status,
    commitment_note: note || null,
    committed_at: status === 'committed' ? new Date().toISOString() : null,
  }

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('dev_opportunity_preferences')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data as DevOpportunityPreference
  } else {
    // Create new with commitment
    const { data, error } = await supabase
      .from('dev_opportunity_preferences')
      .insert({
        dev_id: user.id,
        opportunity_id: opportunityId,
        is_starred: false,
        is_hidden: false,
        ...updateData,
      })
      .select()
      .single()

    if (error) throw error
    return data as DevOpportunityPreference
  }
}

/**
 * Remove commitment from an opportunity
 */
export async function removeCommitment(
  opportunityId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('dev_opportunity_preferences')
    .update({
      commitment_status: null,
      commitment_note: null,
      committed_at: null,
    })
    .eq('dev_id', user.id)
    .eq('opportunity_id', opportunityId)

  if (error) throw error
}

/**
 * Get devs who have committed to an opportunity (admin)
 */
export async function getCommittedDevs(
  opportunityId: string
): Promise<Array<{
  dev_id: string
  name: string
  email: string
  commitment_status: CommitmentStatus
  commitment_note: string | null
  committed_at: string | null
}>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dev_opportunity_preferences')
    .select(`
      dev_id,
      commitment_status,
      commitment_note,
      committed_at,
      profile:profiles!dev_id(id, name, email)
    `)
    .eq('opportunity_id', opportunityId)
    .in('commitment_status', ['interested', 'committed'])
    .order('committed_at', { ascending: false, nullsFirst: false })

  if (error) throw error

  return (data || []).map(item => {
    const profile = Array.isArray(item.profile) ? item.profile[0] : item.profile
    return {
      dev_id: item.dev_id,
      name: profile?.name || 'Unknown',
      email: profile?.email || '',
      commitment_status: item.commitment_status as CommitmentStatus,
      commitment_note: item.commitment_note,
      committed_at: item.committed_at,
    }
  })
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeOpportunityRelations(opp: Record<string, unknown>): ProjectOpportunity {
  const project = Array.isArray(opp.project) ? opp.project[0] : opp.project
  const creator = Array.isArray(opp.creator) ? opp.creator[0] : opp.creator

  // Extract bid count from aggregation
  const bidsCount = Array.isArray(opp.bids) && opp.bids[0]
    ? (opp.bids[0] as { count: number }).count
    : 0

  // Remove the raw bids array and add the normalized count
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { bids, ...rest } = opp

  return { ...rest, project, creator, bids_count: bidsCount } as ProjectOpportunity
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

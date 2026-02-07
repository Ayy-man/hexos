// Types and pure functions for opportunities that can be imported by client components
// This file intentionally does NOT import from lib/supabase/server to avoid server-only dependencies

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'withdrawn'
export type OpportunityStatus = 'draft' | 'open' | 'filled' | 'closed'
export type ApplicationStatus = 'pending' | 'shortlisted' | 'accepted' | 'rejected'
export type ProjectComplexity = 'low' | 'medium' | 'high'
export type CommitmentStatus = 'interested' | 'committed' | 'declined' | null

export interface ProjectOpportunity {
  id: string
  project_id: string | null
  title: string
  description: string | null
  requirements: string | null
  estimated_hours: number | null
  estimated_weeks: number | null
  estimated_hours_min: number | null
  estimated_hours_max: number | null
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
  bids_count?: number
}

export interface DevOpportunityPreference {
  id: string
  dev_id: string
  opportunity_id: string
  is_starred: boolean
  is_hidden: boolean
  commitment_status: CommitmentStatus
  committed_at: string | null
  commitment_note: string | null
  created_at: string
  updated_at: string
}

export interface OpportunityWithPrefs extends ProjectOpportunity {
  preference?: DevOpportunityPreference | null
  is_starred?: boolean
  is_hidden?: boolean
  commitment_status?: CommitmentStatus
  committed_at?: string | null
  commitment_note?: string | null
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

// ============================================================================
// PURE UTILITY FUNCTIONS
// ============================================================================

/**
 * Format opportunity duration for display
 */
export function formatDuration(opportunity: ProjectOpportunity): string {
  // Prefer weeks-based estimate
  if (opportunity.estimated_weeks) {
    return `${opportunity.estimated_weeks} week${opportunity.estimated_weeks !== 1 ? 's' : ''}`
  }

  // Fall back to hour range
  if (opportunity.estimated_hours_min && opportunity.estimated_hours_max) {
    return `${opportunity.estimated_hours_min}-${opportunity.estimated_hours_max} hours`
  }

  // Fall back to single hours estimate
  if (opportunity.estimated_hours) {
    return `${opportunity.estimated_hours} hours`
  }

  return 'TBD'
}

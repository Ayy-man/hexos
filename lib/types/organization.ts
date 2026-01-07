// ============================================================================
// Organization Types
// ============================================================================

export type OrganizationType = 'dfy_agency' | 'dev_agency'

export type OrgMemberRole = 'owner' | 'admin' | 'member'

export interface Organization {
  id: string
  name: string
  slug: string
  type: OrganizationType
  website: string | null
  contact_email: string | null
  settings: OrganizationSettings
  max_seats: number
  created_at: string
  updated_at: string
  created_by: string | null
  is_active: boolean
}

export interface OrganizationSettings {
  // DFY-specific
  default_commission_pct?: number
  // Dev-specific
  hourly_rate?: number
  // Shared
  [key: string]: unknown
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrgMemberRole
  is_active: boolean
  joined_at: string
  invited_by: string | null
}

// Extended with profile info for display
export interface OrganizationMemberWithProfile extends OrganizationMember {
  profile: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

// Organization with computed fields
export interface OrganizationWithStats extends Organization {
  member_count: number
  pending_invite_count: number
  project_count?: number
}

// ============================================================================
// Invitation Types
// ============================================================================

// Note: These map to org_invitation_type and org_invitation_status in the DB
// (prefixed with org_ to avoid conflict with existing invitation_status enum)
export type InvitationType =
  | 'admin'      // Hexona admin invite
  | 'internal'   // Hexona internal invite
  | 'dfy_first'  // Hexona invites first DFY (creates org)
  | 'dfy_team'   // DFY owner invites team member
  | 'dev_solo'   // Hexona approves dev application
  | 'dev_team'   // Dev agency owner invites team member

export type InvitationStatus =
  | 'pending_approval'  // Dev application awaiting review
  | 'pending'           // Invitation sent, awaiting acceptance
  | 'accepted'          // User accepted
  | 'expired'           // Past expiry date
  | 'revoked'           // Manually cancelled
  | 'rejected'          // Dev application rejected

export type TargetRole = 'admin' | 'internal' | 'dfy' | 'dev'

export interface Invitation {
  id: string
  type: InvitationType
  email: string
  token: string
  organization_id: string | null
  new_organization_name: string | null
  target_role: TargetRole
  status: InvitationStatus
  invited_by: string | null
  created_at: string
  expires_at: string
  accepted_at: string | null
  application_data: DevApplicationData | null
}

// Extended with related data for display
export interface InvitationWithDetails extends Invitation {
  organization?: Organization | null
  inviter?: {
    id: string
    email: string
    full_name: string | null
  } | null
}

// Dev application data stored in invitation
export interface DevApplicationData {
  name: string
  portfolio: string | null
  skills: string[]
  availability: 'full-time' | 'part-time' | 'contract'
  bio: string | null
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateOrganizationInput {
  name: string
  type: OrganizationType
  website?: string
  contact_email?: string
  settings?: OrganizationSettings
  max_seats?: number
}

export interface UpdateOrganizationInput {
  name?: string
  website?: string
  contact_email?: string
  settings?: OrganizationSettings
}

export interface CreateInvitationInput {
  type: InvitationType
  email: string
  organization_id?: string
  new_organization_name?: string
  target_role: TargetRole
  application_data?: DevApplicationData
}

export interface CreateTeamInvitationInput {
  email: string
  organization_id: string
}

export interface CreateAdminInvitationInput {
  email: string
  target_role: 'admin' | 'internal'
}

export interface CreateDfyFirstInvitationInput {
  email: string
  organization_name: string
}

export interface CreateDevApplicationInput {
  name: string
  email: string
  portfolio?: string
  skills: string[]
  availability: 'full-time' | 'part-time' | 'contract'
  bio?: string
}

// ============================================================================
// API Response Types
// ============================================================================

export interface OrganizationListResponse {
  organizations: OrganizationWithStats[]
  total: number
}

export interface InvitationListResponse {
  invitations: InvitationWithDetails[]
  total: number
}

export interface AcceptInvitationResult {
  success: boolean
  user_id?: string
  organization_id?: string
  redirect_to: string
  error?: string
}

export interface InvitationValidation {
  valid: boolean
  invitation?: InvitationWithDetails
  error?: string
  expired?: boolean
  already_accepted?: boolean
  seats_full?: boolean
}

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import type {
  Invitation,
  InvitationWithDetails,
  InvitationType,
  InvitationStatus,
  CreateInvitationInput,
  CreateAdminInvitationInput,
  CreateDfyFirstInvitationInput,
  CreateTeamInvitationInput,
  CreateDevApplicationInput,
  InvitationValidation,
  AcceptInvitationResult,
} from '@/lib/types/organization'
import { createOrganization, addOrganizationMember } from './organizations'

// ============================================================================
// Invitation Queries
// ============================================================================

/**
 * Get invitation by token (for accept page)
 */
export async function getInvitationByToken(
  token: string
): Promise<InvitationWithDetails | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      organization:organizations(*),
      inviter:profiles!invitations_invited_by_fkey(id, email, name)
    `)
    .eq('token', token)
    .single()

  if (error) {
    console.error('[getInvitationByToken] Error:', error)
    return null
  }

  return data as InvitationWithDetails
}

/**
 * Get invitation by ID
 */
export async function getInvitation(id: string): Promise<Invitation | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[getInvitation] Error:', error)
    return null
  }

  return data
}

/**
 * Get all invitations for an organization
 */
export async function getOrganizationInvitations(
  organizationId: string
): Promise<InvitationWithDetails[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      inviter:profiles!invitations_invited_by_fkey(id, email, name)
    `)
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'pending_approval'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getOrganizationInvitations] Error:', error)
    return []
  }

  return data as InvitationWithDetails[]
}

/**
 * Get all pending admin/internal invitations (Hexona team)
 */
export async function getHexonaTeamInvitations(): Promise<InvitationWithDetails[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      inviter:profiles!invitations_invited_by_fkey(id, email, name)
    `)
    .in('type', ['admin', 'internal'])
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getHexonaTeamInvitations] Error:', error)
    return []
  }

  return data as InvitationWithDetails[]
}

/**
 * Get all pending DFY first invitations (new agencies)
 */
export async function getPendingDfyFirstInvitations(): Promise<InvitationWithDetails[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      inviter:profiles!invitations_invited_by_fkey(id, email, name)
    `)
    .eq('type', 'dfy_first')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPendingDfyFirstInvitations] Error:', error)
    return []
  }

  return data as InvitationWithDetails[]
}

/**
 * Get all dev applications awaiting approval
 */
export async function getDevApplications(): Promise<InvitationWithDetails[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('type', 'dev_solo')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getDevApplications] Error:', error)
    return []
  }

  return data as InvitationWithDetails[]
}

// ============================================================================
// Create Invitations
// ============================================================================

/**
 * Create admin/internal invitation (Hexona team)
 */
export async function createAdminInvitation(
  input: CreateAdminInvitationInput,
  invitedBy: string
): Promise<Invitation | null> {
  const supabase = await createAdminClient()

  const invitationType: InvitationType =
    input.target_role === 'admin' ? 'admin' : 'internal'

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      type: invitationType,
      email: input.email.toLowerCase(),
      target_role: input.target_role,
      invited_by: invitedBy,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[createAdminInvitation] Error:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Create DFY first invitation (new agency)
 */
export async function createDfyFirstInvitation(
  input: CreateDfyFirstInvitationInput,
  invitedBy: string
): Promise<Invitation | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      type: 'dfy_first',
      email: input.email.toLowerCase(),
      target_role: 'dfy',
      new_organization_name: input.organization_name,
      invited_by: invitedBy,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[createDfyFirstInvitation] Error:', error)
    return null
  }

  return data
}

/**
 * Create team member invitation (DFY or Dev agency)
 */
export async function createTeamInvitation(
  input: CreateTeamInvitationInput,
  invitedBy: string,
  type: 'dfy_team' | 'dev_team'
): Promise<Invitation | null> {
  const supabase = await createClient()

  const targetRole = type === 'dfy_team' ? 'dfy' : 'dev'

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      type,
      email: input.email.toLowerCase(),
      organization_id: input.organization_id,
      target_role: targetRole,
      invited_by: invitedBy,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[createTeamInvitation] Error:', error)
    return null
  }

  return data
}

/**
 * Create dev application (self-signup)
 */
export async function createDevApplication(
  input: CreateDevApplicationInput
): Promise<Invitation | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      type: 'dev_solo',
      email: input.email.toLowerCase(),
      target_role: 'dev',
      status: 'pending_approval',
      application_data: {
        name: input.name,
        portfolio: input.portfolio || null,
        skills: input.skills,
        availability: input.availability,
        bio: input.bio || null,
      },
    })
    .select()
    .single()

  if (error) {
    console.error('[createDevApplication] Error:', error)
    return null
  }

  return data
}

/**
 * Create dev invitation (admin directly invites developer)
 */
export async function createDevInvitation(
  email: string,
  invitedBy: string
): Promise<Invitation | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      type: 'dev_solo',
      email: email.toLowerCase(),
      target_role: 'dev',
      status: 'pending', // Skip pending_approval since admin is inviting directly
      invited_by: invitedBy,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[createDevInvitation] Error:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Get all pending dev invitations (admin-invited, not applications)
 */
export async function getPendingDevInvitations(): Promise<InvitationWithDetails[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      inviter:profiles!invitations_invited_by_fkey(id, email, name)
    `)
    .eq('type', 'dev_solo')
    .eq('status', 'pending')
    .not('invited_by', 'is', null) // Only admin-invited, not approved applications
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPendingDevInvitations] Error:', error)
    return []
  }

  return data as InvitationWithDetails[]
}

// ============================================================================
// Invitation Actions
// ============================================================================

/**
 * Validate an invitation token
 */
export async function validateInvitation(token: string): Promise<InvitationValidation> {
  const invitation = await getInvitationByToken(token)

  if (!invitation) {
    return { valid: false, error: 'Invitation not found' }
  }

  if (invitation.status === 'accepted') {
    return { valid: false, invitation, error: 'Invitation already accepted', already_accepted: true }
  }

  if (invitation.status === 'revoked') {
    return { valid: false, invitation, error: 'Invitation has been revoked' }
  }

  if (invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()) {
    return { valid: false, invitation, error: 'Invitation has expired', expired: true }
  }

  if (invitation.status === 'rejected') {
    return { valid: false, invitation, error: 'Application was rejected' }
  }

  // For org invitations, check seat availability
  if (invitation.organization_id) {
    const supabase = await createAdminClient()

    // Check max seats
    const { data: org } = await supabase
      .from('organizations')
      .select('max_seats')
      .eq('id', invitation.organization_id)
      .single()

    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', invitation.organization_id)
      .eq('is_active', true)

    if (org && memberCount !== null && memberCount >= org.max_seats) {
      return { valid: false, invitation, error: 'Organization is at capacity', seats_full: true }
    }
  }

  return { valid: true, invitation }
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<AcceptInvitationResult> {
  const validation = await validateInvitation(token)

  if (!validation.valid || !validation.invitation) {
    return {
      success: false,
      redirect_to: '/login',
      error: validation.error,
    }
  }

  const invitation = validation.invitation
  const supabase = await createAdminClient()

  try {
    // Handle based on invitation type
    switch (invitation.type) {
      case 'admin':
      case 'internal':
        // Just update profile role
        await supabase
          .from('profiles')
          .update({ role: invitation.target_role })
          .eq('id', userId)
        break

      case 'dfy_first':
        // Create organization and add user as owner
        if (!invitation.new_organization_name) {
          return { success: false, redirect_to: '/login', error: 'Organization name missing' }
        }

        const org = await createOrganization(
          {
            name: invitation.new_organization_name,
            type: 'dfy_agency',
          },
          userId
        )

        if (!org) {
          return { success: false, redirect_to: '/login', error: 'Failed to create organization' }
        }

        await addOrganizationMember(org.id, userId, 'owner', invitation.invited_by || undefined)

        // Update profile role
        await supabase
          .from('profiles')
          .update({ role: 'dfy' })
          .eq('id', userId)

        break

      case 'dfy_team':
      case 'dev_team':
        // Add user to existing organization
        if (!invitation.organization_id) {
          return { success: false, redirect_to: '/login', error: 'Organization ID missing' }
        }

        await addOrganizationMember(
          invitation.organization_id,
          userId,
          'member',
          invitation.invited_by || undefined
        )

        // Update profile role
        await supabase
          .from('profiles')
          .update({ role: invitation.target_role })
          .eq('id', userId)

        break

      case 'dev_solo':
        // Just update profile role (no org)
        await supabase
          .from('profiles')
          .update({ role: 'dev' })
          .eq('id', userId)
        break
    }

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    // Determine redirect
    const redirectTo = getRedirectForRole(invitation.target_role)

    return {
      success: true,
      user_id: userId,
      organization_id: invitation.organization_id || undefined,
      redirect_to: redirectTo,
    }
  } catch (error) {
    console.error('[acceptInvitation] Error:', error)
    return {
      success: false,
      redirect_to: '/login',
      error: 'Failed to accept invitation',
    }
  }
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .in('status', ['pending', 'pending_approval'])

  if (error) {
    console.error('[revokeInvitation] Error:', error)
    return false
  }

  return true
}

/**
 * Resend an invitation (creates new token)
 */
export async function resendInvitation(invitationId: string): Promise<Invitation | null> {
  const supabase = await createAdminClient()

  // Generate new token and extend expiry
  const newToken = crypto.randomUUID()
  const newExpiry = new Date()
  newExpiry.setDate(newExpiry.getDate() + 7)

  const { data, error } = await supabase
    .from('invitations')
    .update({
      token: newToken,
      expires_at: newExpiry.toISOString(),
      status: 'pending',
    })
    .eq('id', invitationId)
    .select()
    .single()

  if (error) {
    console.error('[resendInvitation] Error:', error)
    return null
  }

  return data
}

/**
 * Approve a dev application
 */
export async function approveDevApplication(invitationId: string): Promise<boolean> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('invitations')
    .update({
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', invitationId)
    .eq('type', 'dev_solo')
    .eq('status', 'pending_approval')

  if (error) {
    console.error('[approveDevApplication] Error:', error)
    return false
  }

  return true
}

/**
 * Reject a dev application
 */
export async function rejectDevApplication(invitationId: string): Promise<boolean> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('invitations')
    .update({ status: 'rejected' })
    .eq('id', invitationId)
    .eq('type', 'dev_solo')
    .eq('status', 'pending_approval')

  if (error) {
    console.error('[rejectDevApplication] Error:', error)
    return false
  }

  return true
}

// ============================================================================
// Helpers
// ============================================================================

function getRedirectForRole(role: string): string {
  switch (role) {
    case 'admin':
      return '/dashboard'
    case 'internal':
      return '/dashboard'
    case 'dfy':
      return '/dashboard/dfy'
    case 'dev':
      return '/dashboard/dev'
    default:
      return '/dashboard'
  }
}

/**
 * Check if email already has pending invitation
 */
export async function hasExistingInvitation(
  email: string,
  organizationId?: string
): Promise<boolean> {
  const supabase = await createAdminClient()

  let query = supabase
    .from('invitations')
    .select('id')
    .eq('email', email.toLowerCase())
    .in('status', ['pending', 'pending_approval'])

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  } else {
    query = query.is('organization_id', null)
  }

  const { data } = await query.limit(1)
  return (data?.length || 0) > 0
}

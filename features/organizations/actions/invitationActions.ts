'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createAdminInvitation,
  createDfyFirstInvitation,
  createTeamInvitation,
  createDevApplication,
  validateInvitation,
  acceptInvitation,
  revokeInvitation,
  resendInvitation,
  approveDevApplication,
  rejectDevApplication,
  hasExistingInvitation,
} from '@/lib/api/invitations'
import { hasAvailableSeats } from '@/lib/api/organizations'
import type {
  CreateAdminInvitationInput,
  CreateDfyFirstInvitationInput,
  CreateTeamInvitationInput,
  CreateDevApplicationInput,
  InvitationWithDetails,
} from '@/lib/types/organization'

// ============================================================================
// Admin/Internal Invitations (Hexona only)
// ============================================================================

/**
 * Invite admin or internal user (admin only)
 */
export async function inviteAdminUserAction(
  input: CreateAdminInvitationInput
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Check user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Only admins can invite admin/internal users' }
    }

    // Check if invitation already exists
    const exists = await hasExistingInvitation(input.email)
    if (exists) {
      return { success: false, error: 'An invitation already exists for this email' }
    }

    const invitation = await createAdminInvitation(input, user.id)

    if (!invitation) {
      return { success: false, error: 'Invitation creation returned null' }
    }

    // TODO: Send invitation email via Resend

    revalidatePath('/dashboard/admin/team')

    return { success: true, invitationId: invitation.id }
  } catch (error) {
    console.error('[inviteAdminUserAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invitation',
    }
  }
}

// ============================================================================
// DFY First Invitation (Hexona invites first DFY partner)
// ============================================================================

/**
 * Invite first DFY partner to create their agency (admin only)
 */
export async function inviteDfyAgencyAction(
  input: CreateDfyFirstInvitationInput
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Check user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Only admins can invite DFY agencies' }
    }

    // Check if invitation already exists
    const exists = await hasExistingInvitation(input.email)
    if (exists) {
      return { success: false, error: 'An invitation already exists for this email' }
    }

    const invitation = await createDfyFirstInvitation(input, user.id)

    if (!invitation) {
      return { success: false, error: 'Failed to create invitation' }
    }

    // TODO: Send invitation email via Resend

    revalidatePath('/dashboard/admin/partners')

    return { success: true, invitationId: invitation.id }
  } catch (error) {
    console.error('[inviteDfyAgencyAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invitation',
    }
  }
}

// ============================================================================
// Team Invitations (DFY/Dev org owner invites team member)
// ============================================================================

/**
 * Invite a team member to organization
 */
export async function inviteTeamMemberAction(
  input: CreateTeamInvitationInput,
  type: 'dfy_team' | 'dev_team'
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Check organization has available seats
    const hasSeats = await hasAvailableSeats(input.organization_id)
    if (!hasSeats) {
      return { success: false, error: 'Organization has no available seats' }
    }

    // Check if invitation already exists for this org
    const exists = await hasExistingInvitation(input.email, input.organization_id)
    if (exists) {
      return { success: false, error: 'An invitation already exists for this email' }
    }

    const invitation = await createTeamInvitation(input, user.id, type)

    if (!invitation) {
      return { success: false, error: 'Failed to create invitation' }
    }

    // TODO: Send invitation email via Resend

    revalidatePath('/settings/team')

    return { success: true, invitationId: invitation.id }
  } catch (error) {
    console.error('[inviteTeamMemberAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invitation',
    }
  }
}

// ============================================================================
// Dev Application (Self-signup)
// ============================================================================

/**
 * Submit dev application (public - no auth required)
 */
export async function submitDevApplicationAction(
  input: CreateDevApplicationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if application already exists
    const exists = await hasExistingInvitation(input.email)
    if (exists) {
      return { success: false, error: 'An application already exists for this email' }
    }

    const invitation = await createDevApplication(input)

    if (!invitation) {
      return { success: false, error: 'Failed to submit application' }
    }

    // TODO: Send confirmation email to applicant
    // TODO: Notify admins of new application

    return { success: true }
  } catch (error) {
    console.error('[submitDevApplicationAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit application',
    }
  }
}

/**
 * Approve a dev application (admin only)
 */
export async function approveDevApplicationAction(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Check user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Only admins can approve applications' }
    }

    const success = await approveDevApplication(invitationId)

    if (!success) {
      return { success: false, error: 'Failed to approve application' }
    }

    // TODO: Send approval email with invitation link

    revalidatePath('/dashboard/admin/applications')

    return { success: true }
  } catch (error) {
    console.error('[approveDevApplicationAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve application',
    }
  }
}

/**
 * Reject a dev application (admin only)
 */
export async function rejectDevApplicationAction(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Check user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Only admins can reject applications' }
    }

    const success = await rejectDevApplication(invitationId)

    if (!success) {
      return { success: false, error: 'Failed to reject application' }
    }

    // TODO: Send rejection email (optional)

    revalidatePath('/dashboard/admin/applications')

    return { success: true }
  } catch (error) {
    console.error('[rejectDevApplicationAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject application',
    }
  }
}

// ============================================================================
// Invitation Management
// ============================================================================

/**
 * Validate an invitation token
 */
export async function validateInvitationAction(
  token: string
): Promise<{
  success: boolean
  valid?: boolean
  invitation?: InvitationWithDetails
  error?: string
}> {
  try {
    const validation = await validateInvitation(token)

    return {
      success: true,
      valid: validation.valid,
      invitation: validation.invitation,
      error: validation.error,
    }
  } catch (error) {
    console.error('[validateInvitationAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate invitation',
    }
  }
}

/**
 * Accept an invitation
 */
export async function acceptInvitationAction(
  token: string
): Promise<{
  success: boolean
  redirectTo?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const result = await acceptInvitation(token, user.id)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Revalidate relevant paths
    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return { success: true, redirectTo: result.redirect_to }
  } catch (error) {
    console.error('[acceptInvitationAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept invitation',
    }
  }
}

/**
 * Revoke a pending invitation
 */
export async function revokeInvitationAction(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await revokeInvitation(invitationId)

    if (!success) {
      return { success: false, error: 'Failed to revoke invitation' }
    }

    revalidatePath('/settings/team')
    revalidatePath('/dashboard/admin/team')
    revalidatePath('/dashboard/admin/partners')

    return { success: true }
  } catch (error) {
    console.error('[revokeInvitationAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke invitation',
    }
  }
}

/**
 * Resend an invitation (generates new token and extends expiry)
 */
export async function resendInvitationAction(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const invitation = await resendInvitation(invitationId)

    if (!invitation) {
      return { success: false, error: 'Failed to resend invitation' }
    }

    // TODO: Send email with new invitation link

    revalidatePath('/settings/team')
    revalidatePath('/dashboard/admin/team')
    revalidatePath('/dashboard/admin/partners')

    return { success: true }
  } catch (error) {
    console.error('[resendInvitationAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend invitation',
    }
  }
}

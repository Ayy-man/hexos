'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createOrganization,
  updateOrganization,
  deactivateOrganization,
  addOrganizationMember,
  updateMemberRole,
  deactivateMember,
  reactivateMember,
  getOrganizationSeats,
  hasAvailableSeats,
  getUserMembership,
} from '@/lib/api/organizations'
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrgMemberRole,
} from '@/lib/types/organization'

// ============================================================================
// Organization Management
// ============================================================================

/**
 * Create a new organization (admin only for dfy_first, or converting dev to agency)
 */
export async function createOrganizationAction(
  input: CreateOrganizationInput
): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const org = await createOrganization(input, user.id)

    if (!org) {
      return { success: false, error: 'Failed to create organization' }
    }

    revalidatePath('/dashboard/admin/partners')

    return { success: true, organizationId: org.id }
  } catch (error) {
    console.error('[createOrganizationAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create organization',
    }
  }
}

/**
 * Update organization settings (org owner/admin only)
 */
export async function updateOrganizationAction(
  organizationId: string,
  input: UpdateOrganizationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const org = await updateOrganization(organizationId, input)

    if (!org) {
      return { success: false, error: 'Failed to update organization' }
    }

    revalidatePath(`/dashboard/admin/partners`)

    return { success: true }
  } catch (error) {
    console.error('[updateOrganizationAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update organization',
    }
  }
}

/**
 * Deactivate an organization (admin only - soft delete)
 */
export async function deactivateOrganizationAction(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deactivateOrganization(organizationId)

    if (!success) {
      return { success: false, error: 'Failed to deactivate organization' }
    }

    revalidatePath('/dashboard/admin/partners')

    return { success: true }
  } catch (error) {
    console.error('[deactivateOrganizationAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate organization',
    }
  }
}

// ============================================================================
// Member Management
// ============================================================================

/**
 * Update a member's role within the organization
 */
export async function updateMemberRoleAction(
  memberId: string,
  role: OrgMemberRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Cannot demote self
    const membership = await getUserMembership(user.id)
    if (membership && membership.id === memberId) {
      return { success: false, error: 'Cannot change your own role' }
    }

    const success = await updateMemberRole(memberId, role)

    if (!success) {
      return { success: false, error: 'Failed to update member role' }
    }

    return { success: true }
  } catch (error) {
    console.error('[updateMemberRoleAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update member role',
    }
  }
}

/**
 * Deactivate a member (no leaving - only deactivate)
 */
export async function deactivateMemberAction(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Cannot deactivate self
    const membership = await getUserMembership(user.id)
    if (membership && membership.id === memberId) {
      return { success: false, error: 'Cannot deactivate yourself' }
    }

    const success = await deactivateMember(memberId)

    if (!success) {
      return { success: false, error: 'Failed to deactivate member' }
    }

    return { success: true }
  } catch (error) {
    console.error('[deactivateMemberAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate member',
    }
  }
}

/**
 * Reactivate a deactivated member
 */
export async function reactivateMemberAction(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Get the member to check their org has available seats
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('id', memberId)
      .single()

    if (!member) {
      return { success: false, error: 'Member not found' }
    }

    const seats = await getOrganizationSeats(member.organization_id)
    if (seats.available_seats <= 0) {
      return { success: false, error: 'No available seats in organization' }
    }

    const success = await reactivateMember(memberId)

    if (!success) {
      return { success: false, error: 'Failed to reactivate member' }
    }

    return { success: true }
  } catch (error) {
    console.error('[reactivateMemberAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reactivate member',
    }
  }
}

// ============================================================================
// Seat Management
// ============================================================================

/**
 * Get organization seat information
 */
export async function getOrganizationSeatsAction(
  organizationId: string
): Promise<{
  success: boolean
  seats?: { max_seats: number; used_seats: number; pending_invites: number; available_seats: number }
  error?: string
}> {
  try {
    const seats = await getOrganizationSeats(organizationId)
    return { success: true, seats }
  } catch (error) {
    console.error('[getOrganizationSeatsAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get seat information',
    }
  }
}

/**
 * Check if organization can accept new members
 */
export async function checkAvailableSeatsAction(
  organizationId: string
): Promise<{ success: boolean; hasSeats?: boolean; error?: string }> {
  try {
    const hasSeats = await hasAvailableSeats(organizationId)
    return { success: true, hasSeats }
  } catch (error) {
    console.error('[checkAvailableSeatsAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check seat availability',
    }
  }
}

// ============================================================================
// Dev Agency Conversion
// ============================================================================

/**
 * Convert a solo dev to a dev agency owner
 */
export async function createDevAgencyAction(
  name: string
): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Check user is a dev
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'dev') {
      return { success: false, error: 'Only developers can create dev agencies' }
    }

    // Check user doesn't already belong to an organization
    const membership = await getUserMembership(user.id)
    if (membership) {
      return { success: false, error: 'You already belong to an organization' }
    }

    // Create the dev agency
    const org = await createOrganization(
      { name, type: 'dev_agency' },
      user.id
    )

    if (!org) {
      return { success: false, error: 'Failed to create agency' }
    }

    // Add user as owner
    await addOrganizationMember(org.id, user.id, 'owner')

    revalidatePath('/dashboard/dev')

    return { success: true, organizationId: org.id }
  } catch (error) {
    console.error('[createDevAgencyAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create dev agency',
    }
  }
}

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import type {
  Organization,
  OrganizationMember,
  OrganizationMemberWithProfile,
  OrganizationWithStats,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrgMemberRole,
} from '@/lib/types/organization'

// ============================================================================
// Organization CRUD
// ============================================================================

/**
 * Get organization by ID
 */
export async function getOrganization(id: string): Promise<Organization | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[getOrganization] Error:', error)
    return null
  }

  return data
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('[getOrganizationBySlug] Error:', error)
    return null
  }

  return data
}

/**
 * Get all organizations (admin only)
 */
export async function getAllOrganizations(
  type?: 'dfy_agency' | 'dev_agency'
): Promise<OrganizationWithStats[]> {
  const supabase = await createAdminClient()

  let query = supabase
    .from('organizations')
    .select(`
      *,
      organization_members(count),
      invitations(count)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getAllOrganizations] Error:', error)
    return []
  }

  // Transform to include stats
  return (data || []).map((org) => ({
    ...org,
    member_count: org.organization_members?.[0]?.count || 0,
    pending_invite_count: org.invitations?.[0]?.count || 0,
  }))
}

/**
 * Create a new organization
 */
export async function createOrganization(
  input: CreateOrganizationInput,
  createdBy: string
): Promise<Organization | null> {
  const supabase = await createAdminClient()

  // Generate slug from name
  const slug = generateSlug(input.name)

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: input.name,
      slug,
      type: input.type,
      website: input.website || null,
      contact_email: input.contact_email || null,
      settings: input.settings || {},
      max_seats: input.max_seats || 3,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) {
    console.error('[createOrganization] Error:', error)
    return null
  }

  return data
}

/**
 * Update an organization
 */
export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput
): Promise<Organization | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[updateOrganization] Error:', error)
    return null
  }

  return data
}

/**
 * Deactivate an organization (soft delete)
 */
export async function deactivateOrganization(id: string): Promise<boolean> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('organizations')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[deactivateOrganization] Error:', error)
    return false
  }

  return true
}

// ============================================================================
// Organization Members
// ============================================================================

/**
 * Get members of an organization
 */
export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMemberWithProfile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      profile:profiles(id, email, name, avatar_url)
    `)
    .eq('organization_id', organizationId)
    .order('role', { ascending: true }) // owner first, then admin, then member
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('[getOrganizationMembers] Error:', error)
    return []
  }

  return (data || []).map((member) => ({
    ...member,
    profile: member.profile || {
      id: member.user_id,
      email: 'unknown',
      name: null,
      avatar_url: null,
    },
  }))
}

/**
 * Get user's organization for a specific type
 */
export async function getUserOrganization(
  userId: string,
  type: 'dfy_agency' | 'dev_agency'
): Promise<Organization | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      organization:organizations(*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error || !data?.organization) {
    return null
  }

  const org = (Array.isArray(data.organization) ? data.organization[0] : data.organization) as Organization
  if (!org || org.type !== type) {
    return null
  }

  return org
}

/**
 * Get user's organization membership
 */
export async function getUserMembership(
  userId: string
): Promise<(OrganizationMember & { organization: Organization }) | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error) {
    return null
  }

  return data as OrganizationMember & { organization: Organization }
}

/**
 * Add a member to an organization
 */
export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  role: OrgMemberRole = 'member',
  invitedBy?: string
): Promise<OrganizationMember | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      role,
      invited_by: invitedBy || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[addOrganizationMember] Error:', error)
    return null
  }

  return data
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  memberId: string,
  role: OrgMemberRole
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('id', memberId)

  if (error) {
    console.error('[updateMemberRole] Error:', error)
    return false
  }

  return true
}

/**
 * Deactivate a member (cannot leave, only deactivate)
 */
export async function deactivateMember(memberId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('organization_members')
    .update({ is_active: false })
    .eq('id', memberId)

  if (error) {
    console.error('[deactivateMember] Error:', error)
    return false
  }

  return true
}

/**
 * Reactivate a member
 */
export async function reactivateMember(memberId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('organization_members')
    .update({ is_active: true })
    .eq('id', memberId)

  if (error) {
    console.error('[reactivateMember] Error:', error)
    return false
  }

  return true
}

// ============================================================================
// Organization Stats
// ============================================================================

/**
 * Get organization seat info
 */
export async function getOrganizationSeats(organizationId: string): Promise<{
  max_seats: number
  used_seats: number
  pending_invites: number
  available_seats: number
}> {
  const supabase = await createAdminClient()

  // Get org max seats
  const { data: org } = await supabase
    .from('organizations')
    .select('max_seats')
    .eq('id', organizationId)
    .single()

  // Get active member count
  const { count: memberCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  // Get pending invitation count
  const { count: inviteCount } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending')

  const maxSeats = org?.max_seats || 3
  const usedSeats = memberCount || 0
  const pendingInvites = inviteCount || 0

  return {
    max_seats: maxSeats,
    used_seats: usedSeats,
    pending_invites: pendingInvites,
    available_seats: Math.max(0, maxSeats - usedSeats - pendingInvites),
  }
}

/**
 * Check if organization has available seats
 */
export async function hasAvailableSeats(organizationId: string): Promise<boolean> {
  const seats = await getOrganizationSeats(organizationId)
  return seats.available_seats > 0
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate URL-safe slug from name
 */
function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Add random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 8)
  return `${baseSlug}-${suffix}`
}

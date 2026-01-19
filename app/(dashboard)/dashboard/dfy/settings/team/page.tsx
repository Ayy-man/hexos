import { requireRole } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { getUserMembership, getOrganizationMembers, getOrganizationSeats } from '@/lib/api/organizations'
import { getOrganizationInvitations } from '@/lib/api/invitations'
import { redirect } from 'next/navigation'
import { TeamSettings } from '@/features/organizations/components/TeamSettings'

export default async function DfyTeamSettingsPage() {
  const profile = await requireRole(['dfy'])

  // Get user's organization membership
  const membership = await getUserMembership(profile.id)

  if (!membership || membership.organization.type !== 'dfy_agency') {
    // User doesn't have an organization yet
    redirect('/dashboard/dfy')
  }

  const organization = membership.organization

  // Get organization data in parallel
  const [members, pendingInvitations, seats] = await Promise.all([
    getOrganizationMembers(organization.id),
    getOrganizationInvitations(organization.id),
    getOrganizationSeats(organization.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Settings</h1>
        <p className="text-muted-foreground">
          Manage your agency team and invitations
        </p>
      </div>

      <TeamSettings
        organization={organization}
        members={members}
        pendingInvitations={pendingInvitations}
        currentUserId={profile.id}
        type="dfy_agency"
        seats={seats}
      />
    </div>
  )
}

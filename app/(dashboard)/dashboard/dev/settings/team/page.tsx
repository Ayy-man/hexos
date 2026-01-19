import { requireRole } from '@/lib/auth/guards'
import { getUserMembership, getOrganizationMembers, getOrganizationSeats } from '@/lib/api/organizations'
import { getOrganizationInvitations } from '@/lib/api/invitations'
import { TeamSettings } from '@/features/organizations/components/TeamSettings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'
import { createDevAgencyAction } from '@/features/organizations/actions/organizationActions'
import { redirect } from 'next/navigation'

async function handleCreateAgency(formData: FormData) {
  'use server'
  const name = formData.get('name') as string
  const result = await createDevAgencyAction(name)
  if (result.success) {
    redirect('/dashboard/dev/settings/team')
  }
}

export default async function DevTeamSettingsPage() {
  const profile = await requireRole(['dev'])

  // Get user's organization membership
  const membership = await getUserMembership(profile.id)

  // If user doesn't have an organization, show option to create one
  if (!membership || membership.organization.type !== 'dev_agency') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Settings</h1>
          <p className="text-muted-foreground">
            Create or join a dev agency to collaborate with others
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Create a Dev Agency
            </CardTitle>
            <CardDescription>
              As a solo developer, you can create an agency to invite team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleCreateAgency} className="flex gap-2 max-w-md">
              <input
                type="text"
                name="name"
                placeholder="Agency Name"
                required
                className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
              <Button type="submit">Create Agency</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
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
          Manage your dev agency team and invitations
        </p>
      </div>

      <TeamSettings
        organization={organization}
        members={members}
        pendingInvitations={pendingInvitations}
        currentUserId={profile.id}
        type="dev_agency"
        seats={seats}
      />
    </div>
  )
}

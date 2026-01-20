import { requireRole, getProfile } from '@/lib/auth/guards'
import { getOpportunitiesForDev } from '@/lib/api/project-invitations'
import { getMyBids } from '@/lib/api/bids'
import { DevOpportunitiesContent } from '@/features/dev/components/DevOpportunitiesContent'

export default async function DevOpportunitiesPage() {
  await requireRole(['dev'])
  const profile = await getProfile()

  // Fetch opportunities and user's existing bids in parallel
  const [opportunities, myBids] = await Promise.all([
    getOpportunitiesForDev().catch(() => []),
    getMyBids().catch(() => []),
  ])

  // Create a set of opportunity IDs the dev has already bid on
  const bidOpportunityIds = new Set(myBids.map(b => b.opportunity_id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Available Opportunities
        </h1>
        <p className="text-muted-foreground">
          Browse and bid on projects that match your skills
        </p>
      </div>

      {/* Main Content */}
      <DevOpportunitiesContent
        opportunities={opportunities}
        bidOpportunityIds={Array.from(bidOpportunityIds)}
        devId={profile?.id || ''}
      />
    </div>
  )
}

import Link from 'next/link'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { getInquiries, type InquiryFilter, type ProposalStage } from '@/lib/api/inquiries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Archive, Inbox } from 'lucide-react'
import { InquiryListView } from '@/features/inquiries/components/InquiryListView'
import { STAGE_ORDER } from '@/features/inquiries/components/StageBadge'

const STAGE_STATS: { stage: ProposalStage; label: string; color: string }[] = [
  { stage: 'unopened', label: 'Unopened', color: 'text-red-600' },
  { stage: 'in_queue', label: 'In Queue', color: 'text-blue-600' },
  { stage: 'working', label: 'Working', color: 'text-cyan-600' },
  { stage: 'ready', label: 'Ready', color: 'text-green-600' },
]

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  await requireAuth()
  const profile = await getProfile()
  const { filter: filterParam } = await searchParams

  // Only admin, internal, and dfy can access
  if (!profile || !['admin', 'internal', 'dfy'].includes(profile.role)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You don&apos;t have access to this page.</p>
      </div>
    )
  }

  const isInternal = profile.role === 'admin' || profile.role === 'internal'
  const filter: InquiryFilter = (filterParam === 'archived' ? 'archived' : 'active') as InquiryFilter

  let inquiries: Awaited<ReturnType<typeof getInquiries>> = []
  let archivedCount = 0

  try {
    inquiries = await getInquiries(filter)
    // Get archived count for badge
    if (isInternal && filter === 'active') {
      const archived = await getInquiries('archived')
      archivedCount = archived.length
    }
  } catch (error) {
    console.error('Failed to fetch inquiries:', error)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isInternal ? 'All Inquiries' : 'My Submissions'}
          </h1>
          <p className="text-muted-foreground">
            {isInternal
              ? 'Manage incoming deal submissions and proposal requests'
              : 'View your submitted deals and proposal requests'}
          </p>
        </div>
        <Button asChild>
          <Link href="/inquiries/new">
            <Plus className="h-4 w-4 mr-2" />
            New Submission
          </Link>
        </Button>
      </div>

      {/* Filter Tabs - Admin/Internal only */}
      {isInternal && (
        <div className="flex gap-2">
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            asChild
          >
            <Link href="/inquiries">
              <Inbox className="h-4 w-4 mr-2" />
              Active
            </Link>
          </Button>
          <Button
            variant={filter === 'archived' ? 'default' : 'outline'}
            size="sm"
            asChild
          >
            <Link href="/inquiries?filter=archived">
              <Archive className="h-4 w-4 mr-2" />
              Archived
              {archivedCount > 0 && filter === 'active' && (
                <Badge variant="secondary" className="ml-2">
                  {archivedCount}
                </Badge>
              )}
            </Link>
          </Button>
        </div>
      )}

      {/* Stats - only for active view */}
      {filter === 'active' && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inquiries.length}</div>
            </CardContent>
          </Card>
          {STAGE_STATS.map(({ stage, label, color }) => (
            <Card key={stage}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${color}`}>{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${color}`}>
                  {inquiries.filter((i) => (i.proposal_stage || 'unopened') === stage).length}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inquiries List */}
      {inquiries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            {filter === 'archived' ? (
              <>
                <Archive className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No archived inquiries</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Archived inquiries will appear here
                </p>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No submissions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Submit your first deal or proposal request
                </p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/inquiries/new">Create new submission</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <InquiryListView inquiries={inquiries} defaultView="table" />
      )}
    </div>
  )
}

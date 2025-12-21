import Link from 'next/link'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { getInquiries, type InquiryFilter } from '@/lib/api/inquiries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Building2, FileText, ArrowRight, Archive, Inbox } from 'lucide-react'
import { PATH_LABELS } from '@/features/inquiries/constants/fieldMappings'

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  converted: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

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
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inquiries.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">New</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {inquiries.filter((i) => i.status === 'new').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {inquiries.filter((i) => i.status === 'processing').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Converted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {inquiries.filter((i) => i.status === 'converted').length}
              </div>
            </CardContent>
          </Card>
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
        <Card>
          <CardHeader>
            <CardTitle>
              {filter === 'archived' ? 'Archived Inquiries' : 'Recent Submissions'}
            </CardTitle>
            <CardDescription>
              {filter === 'archived'
                ? 'Previously archived inquiries'
                : isInternal
                  ? 'Click on a submission to view details or convert to project'
                  : 'Your submitted deals and proposal requests'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inquiries.map((inquiry) => (
                <Link
                  key={inquiry.id}
                  href={`/inquiries/${inquiry.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {inquiry.archived_at ? (
                        <Archive className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {inquiry.prospect_company_name || 'Unnamed Prospect'}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {inquiry.submission_type === 'closed' ? 'Closed Deal' : 'Proposal'}
                        </Badge>
                        {inquiry.archived_at && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Archive className="h-3 w-3" />
                            Archived
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{PATH_LABELS[inquiry.form_path] || inquiry.form_path}</span>
                        {inquiry.blueprint && (
                          <>
                            <span>•</span>
                            <span>{inquiry.blueprint.name}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        by {inquiry.partner_name} • {formatDate(inquiry.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_COLORS[inquiry.status] || STATUS_COLORS.new}>
                      {inquiry.status}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

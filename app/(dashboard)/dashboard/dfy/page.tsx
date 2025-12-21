import Link from 'next/link'
import { Briefcase, DollarSign, Send, TrendingUp, FileText } from 'lucide-react'
import { requireRole, getProfile } from '@/lib/auth/guards'
import { getProjects } from '@/lib/api/projects'
import { getInquiries } from '@/lib/api/inquiries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PATH_LABELS } from '@/features/inquiries/constants/fieldMappings'

const STATUS_COLORS: Record<string, string> = {
  inquiry_new: 'bg-blue-500',
  proposal_sent: 'bg-yellow-500',
  in_progress: 'bg-cyan-500',
  completed: 'bg-green-500',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

export default async function DfyDashboard() {
  await requireRole(['dfy'])
  const profile = await getProfile()

  let projects: Awaited<ReturnType<typeof getProjects>> = []
  let inquiries: Awaited<ReturnType<typeof getInquiries>> = []

  try {
    projects = await getProjects()
  } catch {
    // RLS filters to DFY's deals only
  }

  try {
    inquiries = await getInquiries()
  } catch {
    // RLS filters to DFY's own inquiries
  }

  // Calculate stats
  const activeDeals = projects.filter((p) =>
    !['completed', 'cancelled', 'on_hold'].includes(p.status)
  )
  const completedDeals = projects.filter((p) => p.status === 'completed')
  const pendingInquiries = inquiries.filter((i) =>
    ['new', 'processing'].includes(i.status)
  )

  // Calculate estimated commission (only for completed deals)
  const totalCommission = completedDeals.reduce((acc, p) => {
    if (p.quoted_price && p.dfy_commission_pct) {
      return acc + (p.quoted_price * p.dfy_commission_pct / 100)
    }
    return acc
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {profile?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            Manage your referred deals and commissions
          </p>
        </div>
        <Button asChild>
          <Link href="/inquiries/new">
            <Send className="mr-2 h-4 w-4" />
            Submit Inquiry
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              {activeDeals.length}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {pendingInquiries.length}
            </div>
            <p className="text-xs text-muted-foreground">Inquiries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalCommission.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Commission</p>
          </CardContent>
        </Card>
      </div>

      {/* My Inquiries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Submissions</CardTitle>
              <CardDescription>Inquiries you&apos;ve submitted</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/inquiries">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {inquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No submissions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Submit an inquiry to get started
              </p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/inquiries/new">Submit your first inquiry</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.slice(0, 5).map((inquiry) => (
                <Link
                  key={inquiry.id}
                  href={`/inquiries/${inquiry.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        inquiry.status === 'new' ? 'bg-blue-500' :
                        inquiry.status === 'processing' ? 'bg-yellow-500' :
                        inquiry.status === 'converted' ? 'bg-green-500' : 'bg-stone-400'
                      }`}
                    />
                    <div>
                      <p className="font-medium">
                        {inquiry.prospect_company_name || 'Unnamed Prospect'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {PATH_LABELS[inquiry.form_path] || inquiry.form_path}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {inquiry.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Deals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Deals</CardTitle>
              <CardDescription>Projects converted from inquiries</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No deals yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Deals appear here after your inquiries are converted
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-2 w-2 rounded-full ${STATUS_COLORS[project.status] || 'bg-stone-400'}`}
                    />
                    <div>
                      <p className="font-medium">{project.project_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.client_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="capitalize">
                      {formatStatus(project.status)}
                    </Badge>
                    {project.quoted_price && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${project.quoted_price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import Link from 'next/link'
import {
  Briefcase,
  DollarSign,
  Send,
  FileText,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from 'lucide-react'
import { requireRole, getProfile } from '@/lib/auth/guards'
import { getProjects } from '@/lib/api/projects'
import { getInquiries, type ProposalStage } from '@/lib/api/inquiries'
import { getStaleProposalsForDfy } from '@/lib/api/proposal-reminders'
import { getPendingExtensions } from '@/lib/api/project-extensions'
import { getActivityTrendsBatch, type ActivityTrendPoint } from '@/lib/api/activity-logs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StageBadge } from '@/features/inquiries/components/StageBadge'
import { InlineSparkline } from '@/components/shared/ActivitySparkline'
import { StaleProposalsBanner } from '@/features/inquiries/components/StaleProposalsBanner'
import { PendingExtensionsList } from '@/features/projects/components/delays/PendingExtensionsList'
import { cn } from '@/lib/utils'

// DFY-visible stages (they don't see internal workflow stages)
const DFY_VISIBLE_STAGES: ProposalStage[] = ['sent', 'closed', 'lost']

function getProjectHealthStatus(project: {
  status: string
  target_delivery_date: string | null
  deliverables?: Array<{ status: string }>
}): 'on_track' | 'at_risk' | 'behind' {
  // Behind if blocked
  if (project.status === 'blocked_client' || project.status === 'blocked_internal') {
    return 'behind'
  }

  // At risk if past target date
  if (project.target_delivery_date) {
    const target = new Date(project.target_delivery_date)
    const now = new Date()
    if (now > target && project.status !== 'completed') {
      return 'behind'
    }
    // At risk if within 7 days of target
    const daysUntil = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntil <= 7 && daysUntil > 0) {
      return 'at_risk'
    }
  }

  // At risk if any deliverables are blocked
  const blockedDeliverables = project.deliverables?.filter(d => d.status === 'blocked') || []
  if (blockedDeliverables.length > 0) {
    return 'at_risk'
  }

  return 'on_track'
}

const HEALTH_CONFIG = {
  on_track: { label: 'On Track', icon: CheckCircle2, color: 'text-green-500' },
  at_risk: { label: 'At Risk', icon: AlertTriangle, color: 'text-orange-500' },
  behind: { label: 'Behind', icon: AlertCircle, color: 'text-red-500' },
}

export default async function DfyDashboard() {
  await requireRole(['dfy'])
  const profile = await getProfile()

  const [projects, inquiries, staleProposals, pendingExtensions] = await Promise.all([
    getProjects().catch(() => []),
    getInquiries().catch(() => []),
    profile?.id ? getStaleProposalsForDfy(profile.id).catch(() => []) : [],
    getPendingExtensions().catch(() => []),
  ])

  // Get activity trends for projects
  const projectEntities = projects.map(p => ({ entity_type: 'project', entity_id: p.id }))
  const activityTrends = await getActivityTrendsBatch(projectEntities, 14).catch(() => new Map())

  // Calculate stats
  const activeDeals = projects.filter((p) =>
    !['completed', 'cancelled', 'on_hold'].includes(p.status)
  )
  const completedDeals = projects.filter((p) => p.status === 'completed')

  // Calculate total earned (commission from completed deals)
  const totalEarned = completedDeals.reduce((acc, p) => {
    if (p.price_dfy && p.dfy_commission_pct) {
      return acc + (p.price_dfy * p.dfy_commission_pct / 100)
    }
    return acc
  }, 0)

  // Health stats for projects
  const projectsWithHealth = projects.map(p => ({
    ...p,
    health: getProjectHealthStatus(p),
  }))
  const onTrackCount = projectsWithHealth.filter(p => p.health === 'on_track').length
  const atRiskCount = projectsWithHealth.filter(p => p.health === 'at_risk').length
  const behindCount = projectsWithHealth.filter(p => p.health === 'behind').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {profile?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            Manage your pipeline and track deal progress
          </p>
        </div>
        <Button asChild>
          <Link href="/inquiries/new">
            <Send className="mr-2 h-4 w-4" />
            Submit Inquiry
          </Link>
        </Button>
      </div>

      {/* Stale Proposals Banner */}
      {staleProposals.length > 0 && (
        <StaleProposalsBanner proposals={staleProposals} />
      )}

      {/* Pending Extension Requests */}
      {pendingExtensions.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-500" />
              <CardTitle>Extension Requests Pending Approval</CardTitle>
              <Badge variant="secondary" className="ml-auto">
                {pendingExtensions.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <PendingExtensionsList extensions={pendingExtensions} />
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid gap-3 grid-cols-3">
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Active Deals</p>
              <p className="text-xl font-bold text-cyan-600 tabular-nums">{activeDeals.length}</p>
            </div>
            <Briefcase className="h-5 w-5 text-cyan-500" />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Won</p>
              <p className="text-xl font-bold tabular-nums">{completedDeals.length}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Earned</p>
              <p className="text-xl font-bold text-green-600 tabular-nums">
                ${totalEarned.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardContent>
        </Card>
      </div>

      {/* Proposal Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Proposal Pipeline</CardTitle>
            <Link href="/inquiries" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {inquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No proposals yet</p>
              <Button variant="link" size="sm" asChild>
                <Link href="/inquiries/new">Submit an inquiry</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
                {inquiries.slice(0, 5).map((inquiry) => (
                  <Link
                    key={inquiry.id}
                    href={`/inquiries/${inquiry.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {inquiry.prospect_company_name || 'Unnamed'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inquiry.price_dfy ? `$${inquiry.price_dfy.toLocaleString()}` : 'No value set'}
                        </p>
                      </div>
                    </div>
                    <StageBadge stage={inquiry.proposal_stage} viewAs="dfy" />
                  </Link>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Column: Projects + Health Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Projects with sparklines */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>My Projects</CardTitle>
              <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Briefcase className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No projects yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projectsWithHealth.slice(0, 6).map((project) => {
                  const trendKey = `project:${project.id}`
                  const trend = activityTrends.get(trendKey) || []
                  const HealthIcon = HEALTH_CONFIG[project.health].icon
                  const done = project.deliverables?.filter(d => d.status === 'done').length || 0
                  const total = project.deliverables?.length || 0
                  const progress = total > 0 ? Math.round((done / total) * 100) : 0

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <HealthIcon className={cn('h-4 w-4 flex-shrink-0', HEALTH_CONFIG[project.health].color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{project.project_name}</p>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {done}/{total}
                          </span>
                        </div>
                        <Progress value={progress} className="h-1 mt-1" />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {project.price_dfy && (
                          <span className="text-xs font-medium text-green-600 tabular-nums">
                            ${project.price_dfy.toLocaleString()}
                          </span>
                        )}
                        <InlineSparkline data={trend} color="primary" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Project Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">On Track</span>
                </div>
                <Badge variant="secondary" className="tabular-nums">{onTrackCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">At Risk</span>
                </div>
                <Badge variant="secondary" className="tabular-nums">{atRiskCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Behind</span>
                </div>
                <Badge variant="destructive" className="tabular-nums">{behindCount}</Badge>
              </div>
            </div>

            {/* Quick health summary */}
            {projects.length > 0 && (
              <div className="pt-3 border-t">
                <div className="flex gap-1 h-2">
                  {onTrackCount > 0 && (
                    <div
                      className="bg-green-500 rounded-full"
                      style={{ width: `${(onTrackCount / projects.length) * 100}%` }}
                    />
                  )}
                  {atRiskCount > 0 && (
                    <div
                      className="bg-orange-500 rounded-full"
                      style={{ width: `${(atRiskCount / projects.length) * 100}%` }}
                    />
                  )}
                  {behindCount > 0 && (
                    <div
                      className="bg-red-500 rounded-full"
                      style={{ width: `${(behindCount / projects.length) * 100}%` }}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {projects.length} total projects
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

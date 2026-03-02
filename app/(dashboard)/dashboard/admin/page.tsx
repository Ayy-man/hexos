import Link from 'next/link'
import {
  FolderKanban,
  TrendingUp,
  Plus,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Users,
} from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { getProjectStats, getProjects } from '@/lib/api/projects'
import { getAllActiveBlockers } from '@/lib/api/blockers'
import { getAllSentProposals, bundleProposalsByDfy } from '@/lib/api/proposal-reminders'
import { getActivityTrendsBatch } from '@/lib/api/activity-logs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { InlineSparkline } from '@/components/shared/ActivitySparkline'
import { cn } from '@/lib/utils'
import { getStatusConfig, StatusDot } from '@/lib/utils/status'

function getProjectHealthStatus(project: {
  status: string
  target_delivery_date: string | null
  deliverables?: Array<{ status: string }>
}): 'on_track' | 'at_risk' | 'behind' {
  if (project.status === 'blocked_client' || project.status === 'blocked_internal') {
    return 'behind'
  }
  if (project.target_delivery_date) {
    const target = new Date(project.target_delivery_date)
    const now = new Date()
    if (now > target && project.status !== 'completed') {
      return 'behind'
    }
    const daysUntil = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntil <= 7 && daysUntil > 0) {
      return 'at_risk'
    }
  }
  const blockedDeliverables = project.deliverables?.filter(d => d.status === 'blocked') || []
  if (blockedDeliverables.length > 0) {
    return 'at_risk'
  }
  return 'on_track'
}

const HEALTH_CONFIG = {
  on_track: { label: 'On Track', icon: CheckCircle2, color: 'text-signal-good', bg: 'bg-signal-good' },
  at_risk: { label: 'At Risk', icon: AlertTriangle, color: 'text-signal-warn', bg: 'bg-signal-warn' },
  behind: { label: 'Behind', icon: AlertCircle, color: 'text-signal-bad', bg: 'bg-signal-bad' },
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

export default async function AdminDashboard() {
  await requireRole(['admin'])

  const [stats, allProjects, sentProposals, activeBlockers] = await Promise.all([
    getProjectStats().catch(() => ({ total: 0, inquiry: 0, active: 0, completed: 0 })),
    getProjects().catch(() => []),
    getAllSentProposals().catch(() => []),
    getAllActiveBlockers().catch(() => []),
  ])

  // Get activity trends for projects (depends on allProjects from above)
  const projectEntities = allProjects.map(p => ({ entity_type: 'project', entity_id: p.id }))
  const activityTrends = await getActivityTrendsBatch(projectEntities, 14).catch(() => new Map())

  // Calculate health stats
  const projectsWithHealth = allProjects.map(p => ({
    ...p,
    health: getProjectHealthStatus(p),
  }))
  const onTrackCount = projectsWithHealth.filter(p => p.health === 'on_track').length
  const atRiskCount = projectsWithHealth.filter(p => p.health === 'at_risk').length
  const behindCount = projectsWithHealth.filter(p => p.health === 'behind').length

  // Group by DFY
  const proposalBundles = bundleProposalsByDfy(sentProposals)
  const pendingProposalsCount = sentProposals.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-text-secondary">
          Overview of all projects and business metrics
        </p>
      </div>

      {/* Stats + Health Summary Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">Total</p>
              <p className="text-xl font-bold tabular-nums">{stats.total}</p>
            </div>
            <FolderKanban className="h-5 w-5 text-text-ghost" />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">Active</p>
              <p className="text-xl font-bold text-accent tabular-nums">{stats.active}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-accent" />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">On Track</p>
              <p className="text-xl font-bold text-signal-good tabular-nums">{onTrackCount}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-signal-good" />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">At Risk</p>
              <p className="text-xl font-bold text-signal-warn tabular-nums">{atRiskCount}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-signal-warn" />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">Behind</p>
              <p className="text-xl font-bold text-signal-bad tabular-nums">{behindCount}</p>
            </div>
            <AlertCircle className="h-5 w-5 text-signal-bad" />
          </CardContent>
        </Card>
      </div>

      {/* Two Column: Projects + Sidebar */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Projects with sparklines */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>All Projects</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                  <Link href="/projects/new">
                    <Plus className="h-3 w-3 mr-1" />
                    New
                  </Link>
                </Button>
                <Link href="/projects" className="text-xs text-text-tertiary hover:text-text-primary flex items-center gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {allProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <FolderKanban className="h-8 w-8 text-text-ghost mb-2" />
                <p className="text-sm text-text-tertiary">No projects yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projectsWithHealth.slice(0, 8).map((project) => {
                  const trendKey = `project:${project.id}`
                  const trend = activityTrends.get(trendKey) || []
                  const HealthIcon = HEALTH_CONFIG[project.health].icon
                  const done = (project.deliverables || []).filter((d: any) => d.status === 'done').length
                  const total = (project.deliverables || []).length
                  const progress = total > 0 ? Math.round((done / total) * 100) : 0

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-bg-hover transition-colors"
                    >
                      <HealthIcon className={cn('h-4 w-4 flex-shrink-0', HEALTH_CONFIG[project.health].color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{project.project_name}</p>
                          <span className="text-xs text-text-tertiary tabular-nums">
                            {done}/{total}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={progress} className="h-1 flex-1" />
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {formatStatus(project.status)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {project.assigned_dev && (
                          <span className="text-[10px] text-text-ghost truncate max-w-[60px]">
                            {project.assigned_dev.name.split(' ')[0]}
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

        {/* Sidebar: Pending Proposals + Blockers */}
        <div className="space-y-4">
          {/* Pending Proposals Compact */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Pending Proposals
                  {pendingProposalsCount > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {pendingProposalsCount}
                    </Badge>
                  )}
                </CardTitle>
                <Link href="/inquiries" className="text-xs text-text-tertiary hover:text-text-primary">
                  View
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {sentProposals.length === 0 ? (
                <p className="text-sm text-text-tertiary text-center py-4">
                  No pending proposals
                </p>
              ) : (
                <div className="space-y-2">
                  {sentProposals.slice(0, 4).map((proposal) => (
                    <div
                      key={proposal.id}
                      className="flex items-center justify-between rounded-lg border p-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-4 w-4 text-text-ghost flex-shrink-0" />
                        <span className="truncate text-xs text-text-secondary">{proposal.prospect_company_name || 'Unnamed Inquiry'}</span>
                      </div>
                      <span className="text-[10px] text-text-ghost flex-shrink-0">
                        {proposal.dfy_partner?.name || proposal.dfy_partner?.email}
                      </span>
                    </div>
                  ))}
                  {sentProposals.length > 4 && (
                    <p className="text-xs text-text-ghost text-center">
                      +{sentProposals.length - 4} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blockers Across Projects */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                Blockers
                {activeBlockers.length > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {activeBlockers.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeBlockers.length === 0 ? (
                <p className="text-sm text-text-tertiary text-center py-4">
                  No blocked items
                </p>
              ) : (
                <div className="space-y-2">
                  {activeBlockers.slice(0, 5).map((blocker) => (
                    <Link
                      key={blocker.id}
                      href={`/admin/blockers`}
                      className="flex items-center gap-2 rounded-lg border p-2 hover:bg-bg-hover transition-colors"
                    >
                      <AlertCircle className="h-4 w-4 text-signal-bad flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{blocker.title}</p>
                        <p className="text-[10px] text-text-tertiary truncate">
                          {blocker.project?.project_name || 'Unknown project'}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {activeBlockers.length > 5 && (
                    <Link href="/admin/blockers" className="block text-xs text-text-ghost text-center hover:underline">
                      +{activeBlockers.length - 5} more
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">Inquiries</span>
                <Badge variant="secondary" className="tabular-nums">{stats.inquiry}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">Completed</span>
                <Badge variant="secondary" className="tabular-nums">{stats.completed}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">Pending Proposals</span>
                <Badge variant="secondary" className="tabular-nums">{pendingProposalsCount}</Badge>
              </div>
              {allProjects.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                    {onTrackCount > 0 && (
                      <div
                        className="bg-signal-good"
                        style={{ width: `${(onTrackCount / allProjects.length) * 100}%` }}
                      />
                    )}
                    {atRiskCount > 0 && (
                      <div
                        className="bg-signal-warn"
                        style={{ width: `${(atRiskCount / allProjects.length) * 100}%` }}
                      />
                    )}
                    {behindCount > 0 && (
                      <div
                        className="bg-signal-bad"
                        style={{ width: `${(behindCount / allProjects.length) * 100}%` }}
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-text-ghost mt-1 text-center">
                    Health distribution
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

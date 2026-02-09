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
  on_track: { label: 'On Track', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500' },
  at_risk: { label: 'At Risk', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500' },
  behind: { label: 'Behind', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500' },
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

export default async function AdminDashboard() {
  await requireRole(['admin'])

  const [stats, allProjects, sentProposals] = await Promise.all([
    getProjectStats().catch(() => ({ total: 0, inquiry: 0, active: 0, completed: 0 })),
    getProjects().catch(() => []),
    getAllSentProposals().catch(() => []),
  ])

  // Get activity trends for projects
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

  // Get all active blockers from blockers table
  const activeBlockers = await getAllActiveBlockers().catch(() => [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of all projects and business metrics
        </p>
      </div>

      {/* Stats + Health Summary Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold tabular-nums">{stats.total}</p>
            </div>
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold text-cyan-600 tabular-nums">{stats.active}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-cyan-500" />
          </CardContent>
        </Card>
        <Card className="py-3 border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/30">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 dark:text-green-400">On Track</p>
              <p className="text-xl font-bold text-green-600 tabular-nums">{onTrackCount}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardContent>
        </Card>
        <Card className="py-3 border-orange-200 bg-orange-50/30 dark:border-orange-900 dark:bg-orange-950/30">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400">At Risk</p>
              <p className="text-xl font-bold text-orange-600 tabular-nums">{atRiskCount}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </CardContent>
        </Card>
        <Card className="py-3 border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 dark:text-red-400">Behind</p>
              <p className="text-xl font-bold text-red-600 tabular-nums">{behindCount}</p>
            </div>
            <AlertCircle className="h-5 w-5 text-red-500" />
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
                <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {allProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <FolderKanban className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No projects yet</p>
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
                      className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <HealthIcon className={cn('h-4 w-4 flex-shrink-0', HEALTH_CONFIG[project.health].color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{project.project_name}</p>
                          <span className="text-xs text-muted-foreground tabular-nums">
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
                          <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
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
                <Link href="/inquiries" className="text-xs text-muted-foreground hover:text-foreground">
                  View
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {proposalBundles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending proposals
                </p>
              ) : (
                <div className="space-y-2">
                  {proposalBundles.slice(0, 4).map((bundle) => (
                    <div
                      key={bundle.dfyPartnerId}
                      className="flex items-center justify-between rounded-lg border p-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-xs">{bundle.dfyPartnerName || bundle.dfyPartnerEmail}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {bundle.proposals.length}
                      </Badge>
                    </div>
                  ))}
                  {proposalBundles.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{proposalBundles.length - 4} more DFY partners
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  No blocked items
                </p>
              ) : (
                <div className="space-y-2">
                  {activeBlockers.slice(0, 5).map((blocker) => (
                    <Link
                      key={blocker.id}
                      href={`/admin/blockers`}
                      className="flex items-center gap-2 rounded-lg border p-2 hover:bg-muted/50 transition-colors"
                    >
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{blocker.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {blocker.project?.project_name || 'Unknown project'}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {activeBlockers.length > 5 && (
                    <Link href="/admin/blockers" className="block text-xs text-muted-foreground text-center hover:underline">
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
                <span className="text-xs text-muted-foreground">Inquiries</span>
                <Badge variant="secondary" className="tabular-nums">{stats.inquiry}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Completed</span>
                <Badge variant="secondary" className="tabular-nums">{stats.completed}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pending Proposals</span>
                <Badge variant="secondary" className="tabular-nums">{pendingProposalsCount}</Badge>
              </div>
              {allProjects.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                    {onTrackCount > 0 && (
                      <div
                        className="bg-green-500"
                        style={{ width: `${(onTrackCount / allProjects.length) * 100}%` }}
                      />
                    )}
                    {atRiskCount > 0 && (
                      <div
                        className="bg-orange-500"
                        style={{ width: `${(atRiskCount / allProjects.length) * 100}%` }}
                      />
                    )}
                    {behindCount > 0 && (
                      <div
                        className="bg-red-500"
                        style={{ width: `${(behindCount / allProjects.length) * 100}%` }}
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">
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

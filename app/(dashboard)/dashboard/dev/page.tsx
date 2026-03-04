import Link from 'next/link'
import { FolderKanban, CheckCircle2, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { getProjects } from '@/lib/api/projects'
import { getMyReportedBlockers } from '@/lib/api/blockers'
import { getActivityTrendsBatch } from '@/lib/api/activity-logs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BlockerCountBadge } from '@/features/dev/components/BlockersList'
import { BlockerReportDialog } from '@/features/dev/components/BlockerReportDialog'
import { HorizontalProjectCard } from '@/features/dev/components/HorizontalProjectCard'

export default async function DevDashboard() {
  const profile = await requireRole(['dev'])

  // Fetch all data in parallel
  const [projects, myBlockers] = await Promise.all([
    getProjects().catch(() => []),
    getMyReportedBlockers().catch(() => []),
  ])

  // Get activity trends for all projects in a batch
  const projectEntities = projects.map(p => ({ entity_type: 'project', entity_id: p.id }))
  const activityTrends = await getActivityTrendsBatch(projectEntities, 14).catch(() => new Map())

  // Calculate deliverable stats across all projects
  const allDeliverables = projects.flatMap((p) => p.deliverables || [])
  const pendingDeliverables = allDeliverables.filter((d) => d.status === 'pending')
  const inProgressDeliverables = allDeliverables.filter((d) => d.status === 'in_progress')
  const completedDeliverables = allDeliverables.filter((d) => d.status === 'done')
  const blockedDeliverables = allDeliverables.filter((d) => d.status === 'blocked')

  // Blocker stats
  const activeBlockers = myBlockers.filter(b => !['resolved', 'closed'].includes(b.status))
  const criticalBlockers = activeBlockers.filter(b => b.priority === 'critical')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {profile?.name?.split(' ')[0]}
        </h1>
        <p className="text-text-secondary">
          Here&apos;s what you&apos;re working on
        </p>
      </div>

      {/* Quick Stats Row - Compact */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">Projects</p>
              <p className="text-xl font-bold tabular-nums">{projects.length}</p>
            </div>
            <FolderKanban className="h-5 w-5 text-text-ghost" />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">Active Tasks</p>
              <p className="text-xl font-bold text-accent tabular-nums">{inProgressDeliverables.length}</p>
            </div>
            <Clock className="h-5 w-5 text-accent" />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">Done</p>
              <p className="text-xl font-bold text-signal-good tabular-nums">{completedDeliverables.length}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-signal-good" />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="p-0 px-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">Blocked</p>
              <p className="text-xl font-bold text-signal-bad tabular-nums">{blockedDeliverables.length}</p>
            </div>
            <AlertCircle className="h-5 w-5 text-signal-bad" />
          </CardContent>
        </Card>
      </div>

      {/* Horizontal Scrollable Projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">My Projects</h2>
          <Link href="/projects" className="text-xs text-text-tertiary hover:text-text-primary flex items-center gap-1">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center text-center">
                <FolderKanban className="h-10 w-10 text-text-ghost mb-3" />
                <p className="text-sm text-text-tertiary">No projects assigned yet</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-8 md:px-8">
            {projects.map((project) => {
              const trendKey = `project:${project.id}`
              const trend = activityTrends.get(trendKey) || []
              return (
                <HorizontalProjectCard
                  key={project.id}
                  id={project.id}
                  projectName={project.project_name}
                  clientName={project.client_name}
                  status={project.status}
                  deliverables={(project.deliverables || []).map(d => ({
                    id: d.id,
                    title: d.title,
                    status: d.status,
                    due_date: d.due_date,
                  }))}
                  targetDeliveryDate={project.target_delivery_date}
                  activityTrend={trend}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Blockers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              My Blockers
              {activeBlockers.length > 0 && (
                <BlockerCountBadge count={activeBlockers.length} critical={criticalBlockers.length} />
              )}
            </CardTitle>
            {projects.length > 0 && (
              <BlockerReportDialog
                projects={projects.map(p => ({ id: p.id, project_name: p.project_name }))}
                deliverables={allDeliverables.map(d => ({
                  id: d.id,
                  title: d.title,
                  project_id: (projects.find(p => p.deliverables?.some(pd => pd.id === d.id)))?.id || '',
                }))}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeBlockers.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">
              No active blockers
            </p>
          ) : (
            <div className="space-y-2">
              {activeBlockers.slice(0, 4).map((blocker) => (
                <Link
                  key={blocker.id}
                  href="/admin/blockers"
                  className="flex items-center justify-between rounded-lg border p-2 text-sm hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className={`h-4 w-4 flex-shrink-0 ${
                      blocker.priority === 'critical' ? 'text-signal-bad' :
                      blocker.priority === 'high' ? 'text-signal-warn' :
                      'text-signal-warn'
                    }`} />
                    <span className="truncate text-xs">{blocker.title}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">
                    {blocker.status.replace(/_/g, ' ')}
                  </Badge>
                </Link>
              ))}
              {activeBlockers.length > 4 && (
                <p className="text-xs text-text-ghost text-center">
                  +{activeBlockers.length - 4} more
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Work - Compact */}
      {pendingDeliverables.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Pending Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {pendingDeliverables.slice(0, 6).map((deliverable) => {
                const project = projects.find((p) =>
                  p.deliverables?.some((d) => d.id === deliverable.id)
                )
                return (
                  <Link
                    key={deliverable.id}
                    href={`/projects/${project?.id}`}
                    className="flex items-center justify-between rounded-lg border p-2 hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-text-ghost" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{deliverable.title}</p>
                        <p className="text-[10px] text-text-tertiary truncate">
                          {project?.project_name}
                        </p>
                      </div>
                    </div>
                    {deliverable.due_date && (
                      <span className="text-[10px] text-text-tertiary flex-shrink-0">
                        {new Date(deliverable.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
            {pendingDeliverables.length > 6 && (
              <p className="text-xs text-text-ghost text-center mt-3">
                +{pendingDeliverables.length - 6} more pending
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

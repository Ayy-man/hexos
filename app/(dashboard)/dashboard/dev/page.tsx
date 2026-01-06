import Link from 'next/link'
import { FolderKanban, CheckCircle2, Clock, AlertCircle, Timer, Plus } from 'lucide-react'
import { requireRole, getProfile } from '@/lib/auth/guards'
import { getProjects } from '@/lib/api/projects'
import { getActiveTimer, getDailyTimeSummary, getWeeklyTimeSummary } from '@/lib/api/time-tracking'
import { getMyReportedBlockers } from '@/lib/api/blockers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ActiveTimerWidget } from '@/features/dev/components/ActiveTimerWidget'
import { TimeLogSummary, CompactTimeSummary } from '@/features/dev/components/TimeLogSummary'
import { BlockersList, BlockerCountBadge } from '@/features/dev/components/BlockersList'
import { TimeEntryForm } from '@/features/dev/components/TimeEntryForm'
import { BlockerReportDialog } from '@/features/dev/components/BlockerReportDialog'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-400',
  in_progress: 'bg-cyan-500',
  blocked: 'bg-red-500',
  done: 'bg-green-500',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

export default async function DevDashboard() {
  await requireRole(['dev'])
  const profile = await getProfile()

  const today = new Date().toISOString().split('T')[0]

  // Fetch all data in parallel
  const [projects, activeTimer, dailySummary, weeklySummary, myBlockers] = await Promise.all([
    getProjects().catch(() => []),
    getActiveTimer().catch(() => null),
    getDailyTimeSummary(today).catch(() => ({ date: today, total_minutes: 0, entries: [] })),
    getWeeklyTimeSummary().catch(() => ({
      week_start: today,
      week_end: today,
      total_minutes: 0,
      daily_breakdown: [],
    })),
    getMyReportedBlockers().catch(() => []),
  ])

  // Calculate deliverable stats across all projects
  const allDeliverables = projects.flatMap((p) => p.deliverables || [])
  const pendingDeliverables = allDeliverables.filter((d) => d.status === 'pending')
  const inProgressDeliverables = allDeliverables.filter((d) => d.status === 'in_progress')
  const completedDeliverables = allDeliverables.filter((d) => d.status === 'done')
  const blockedDeliverables = allDeliverables.filter((d) => d.status === 'blocked')

  const completionRate = allDeliverables.length > 0
    ? Math.round((completedDeliverables.length / allDeliverables.length) * 100)
    : 0

  // Blocker stats
  const activeBlockers = myBlockers.filter(b => !['resolved', 'closed'].includes(b.status))
  const criticalBlockers = activeBlockers.filter(b => b.priority === 'critical')

  return (
    <div className="space-y-6">
      {/* Header with Timer */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {profile?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what you&apos;re working on
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTimer && (
            <ActiveTimerWidget initialTimer={activeTimer} variant="compact" />
          )}
          <TimeEntryForm
            deliverables={allDeliverables.map(d => {
              const project = projects.find(p => p.deliverables?.some(pd => pd.id === d.id))
              return {
                id: d.id,
                title: d.title,
                project: project ? { id: project.id, project_name: project.project_name } : undefined,
              }
            })}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              {inProgressDeliverables.length}
            </div>
            <p className="text-xs text-muted-foreground">deliverables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedDeliverables.length}
            </div>
            <p className="text-xs text-muted-foreground">deliverables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {blockedDeliverables.length}
            </div>
            <p className="text-xs text-muted-foreground">needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Tracking and Progress Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Time Tracking Summary */}
        <TimeLogSummary
          dailySummary={dailySummary}
          weeklySummary={weeklySummary}
          targetHoursPerWeek={40}
        />

        {/* Overall Progress and Blockers */}
        <div className="space-y-4">
          {/* Overall Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={completionRate} className="flex-1" />
                <span className="text-sm font-medium">{completionRate}%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {completedDeliverables.length} of {allDeliverables.length} deliverables completed
              </p>
            </CardContent>
          </Card>

          {/* My Blockers */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active blockers. Nice work!
                </p>
              ) : (
                <div className="space-y-2">
                  {activeBlockers.slice(0, 3).map((blocker) => (
                    <div
                      key={blocker.id}
                      className="flex items-center justify-between rounded-lg border p-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className={`h-4 w-4 flex-shrink-0 ${
                          blocker.priority === 'critical' ? 'text-red-500' :
                          blocker.priority === 'high' ? 'text-orange-500' :
                          'text-amber-500'
                        }`} />
                        <span className="truncate">{blocker.title}</span>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                        {blocker.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                  {activeBlockers.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{activeBlockers.length - 3} more blockers
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* My Projects */}
      <Card>
        <CardHeader>
          <CardTitle>My Projects</CardTitle>
          <CardDescription>Projects assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No projects assigned yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back later for new assignments
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => {
                const deliverables = project.deliverables || []
                const done = deliverables.filter((d) => d.status === 'done').length
                const total = deliverables.length
                const progress = total > 0 ? Math.round((done / total) * 100) : 0

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{project.project_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.client_name}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {formatStatus(project.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={progress} className="flex-1 h-2" />
                      <span className="text-sm text-muted-foreground">
                        {done}/{total}
                      </span>
                    </div>
                    {project.target_delivery_date && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Due: {new Date(project.target_delivery_date).toLocaleDateString()}
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Deliverables */}
      {pendingDeliverables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Work</CardTitle>
            <CardDescription>Deliverables waiting to be started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingDeliverables.slice(0, 5).map((deliverable) => {
                const project = projects.find((p) =>
                  p.deliverables?.some((d) => d.id === deliverable.id)
                )
                return (
                  <div
                    key={deliverable.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[deliverable.status]}`} />
                      <div>
                        <p className="text-sm font-medium">{deliverable.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {project?.project_name}
                        </p>
                      </div>
                    </div>
                    {deliverable.due_date && (
                      <span className="text-xs text-muted-foreground">
                        Due {new Date(deliverable.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { CheckCircle2, Clock, FolderKanban, AlertCircle } from 'lucide-react'
import { requireRole, getProfile } from '@/lib/auth/guards'
import { getProjects } from '@/lib/api/projects'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getStatusConfig, StatusDot } from '@/lib/utils/status'

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

export default async function ClientDashboard() {
  await requireRole(['client'])
  const profile = await getProfile()

  let projects: Awaited<ReturnType<typeof getProjects>> = []

  try {
    projects = await getProjects()
  } catch {
    // RLS filters to client's project only
  }

  // Get the client's project (should be only one)
  const project = projects[0]

  if (!project) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {profile?.name?.split(' ')[0]}
          </h1>
          <p className="text-text-secondary">
            Your project dashboard
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="h-12 w-12 text-text-ghost mb-4" />
            <p className="text-text-tertiary">No project found</p>
            <p className="text-sm text-text-tertiary mt-1">
              Contact your project manager for access
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const deliverables = project.deliverables || []
  const completedDeliverables = deliverables.filter((d) => d.status === 'done')
  const inProgressDeliverables = deliverables.filter((d) => d.status === 'in_progress')
  const blockedDeliverables = deliverables.filter((d) => d.status === 'blocked')

  const completionRate = deliverables.length > 0
    ? Math.round((completedDeliverables.length / deliverables.length) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {project.project_name}
        </h1>
        <p className="text-text-secondary">
          Track your project progress
        </p>
      </div>

      {/* Project Status */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Project Status</CardTitle>
            <Badge variant="secondary" className="capitalize">
              {formatStatus(project.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={completionRate} className="flex-1" />
            <span className="text-lg font-semibold">{completionRate}%</span>
          </div>
          <p className="mt-2 text-sm text-text-tertiary">
            {completedDeliverables.length} of {deliverables.length} deliverables completed
          </p>
          {project.target_delivery_date && (
            <p className="text-sm text-text-tertiary mt-1">
              Target delivery: {new Date(project.target_delivery_date).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-signal-good" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-signal-good">
              {completedDeliverables.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {inProgressDeliverables.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <AlertCircle className="h-4 w-4 text-signal-bad" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-signal-bad">
              {blockedDeliverables.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deliverables */}
      <Card>
        <CardHeader>
          <CardTitle>Deliverables</CardTitle>
          <CardDescription>What&apos;s being built for you</CardDescription>
        </CardHeader>
        <CardContent>
          {deliverables.length === 0 ? (
            <p className="text-center text-text-tertiary py-4">
              No deliverables defined yet
            </p>
          ) : (
            <div className="space-y-3">
              {deliverables.map((deliverable, index) => {
                const config = getStatusConfig(deliverable.status)
                return (
                  <div
                    key={deliverable.id}
                    className="flex items-center gap-4 rounded-lg border border-border-hairline p-4"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-surface border border-border-hairline text-sm font-mono font-medium text-text-secondary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-text-primary">{deliverable.title}</p>
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={deliverable.status} />
                          <span className={`text-xs capitalize ${config.classes.text}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                      {deliverable.due_date && (
                        <p className="text-xs text-text-tertiary font-mono mt-1">
                          Due: {new Date(deliverable.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-tertiary">
            Contact your project manager if you have questions or need to request changes.
          </p>
          {project.assigned_dev && (
            <p className="text-sm mt-2">
              <span className="text-text-tertiary">Developer:</span>{' '}
              <span className="font-medium">{project.assigned_dev.name}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import Link from 'next/link'
import { FolderKanban, FileText, TrendingUp, DollarSign, Plus } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { getProjectStats, getProjects } from '@/lib/api/projects'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const STATUS_COLORS: Record<string, string> = {
  inquiry_new: 'bg-blue-500',
  in_progress: 'bg-cyan-500',
  completed: 'bg-green-500',
  cancelled: 'bg-stone-400',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

export default async function AdminDashboard() {
  await requireRole(['admin'])

  let stats = { total: 0, inquiry: 0, active: 0, completed: 0 }
  let recentProjects: Awaited<ReturnType<typeof getProjects>> = []

  try {
    stats = await getProjectStats()
    recentProjects = (await getProjects()).slice(0, 5)
  } catch {
    // RLS or no data
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of all projects and business metrics
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inquiries</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inquiry}</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Latest activity across all projects</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No projects yet</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/projects/new">Create your first project</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentProjects.map((project) => (
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
                        {project.assigned_dev && ` · ${project.assigned_dev.name}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {formatStatus(project.status)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

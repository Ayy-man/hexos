import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject, getAvailableDevs } from '@/lib/api/projects'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { Badge } from '@/components/ui/badge'
import { ProjectTabs } from '@/features/projects/components/ProjectTabs'

const STATUS_COLORS: Record<string, string> = {
  deliverables_pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  awaiting_signoff: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  signed_off: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  collecting_access: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAuth()
  const profile = await getProfile()
  const { id } = await params

  if (!profile) notFound()

  let project
  try {
    project = await getProject(id)
  } catch {
    notFound()
  }

  // Fetch available devs for admin assignment
  const availableDevs = profile.role === 'admin' ? await getAvailableDevs() : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/projects"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Projects
            </Link>
            <span className="text-muted-foreground">/</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">
            {project.project_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.client_name}
            {project.client_business && ` · ${project.client_business}`}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={STATUS_COLORS[project.status] || 'bg-stone-100 text-stone-700'}
        >
          {formatStatus(project.status)}
        </Badge>
      </div>

      {/* Tabs */}
      <ProjectTabs
        project={project}
        userRole={profile.role}
        userId={profile.id}
        availableDevs={availableDevs}
      />
    </div>
  )
}

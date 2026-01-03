import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject, getAvailableDevs } from '@/lib/api/projects'
import type { ProjectStatus } from '@/lib/api/projects'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { ProjectTabs } from '@/features/projects/components/ProjectTabs'
import { ProjectStatusControl } from '@/features/projects/components/ProjectStatusControl'

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
  } catch (error) {
    // Log the actual error for debugging (Supabase errors are objects, not Error instances)
    console.error('[Project Page Error]', {
      projectId: id,
      error: error instanceof Error ? error.message : JSON.stringify(error, null, 2),
      stack: error instanceof Error ? error.stack : undefined,
    })
    notFound()
  }

  // Fetch available devs for admin assignment
  const availableDevs = profile.role === 'admin' ? await getAvailableDevs() : []

  const isAdmin = profile.role === 'admin' || profile.role === 'internal'

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Status Control */}
      <ProjectStatusControl
        projectId={project.id}
        currentStatus={project.status as ProjectStatus}
        isAdmin={isAdmin}
      />

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

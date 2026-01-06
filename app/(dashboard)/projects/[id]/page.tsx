import { notFound } from 'next/navigation'
import { getProject, getAvailableDevs } from '@/lib/api/projects'
import type { ProjectStatus } from '@/lib/api/projects'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { ProjectTabs } from '@/features/projects/components/ProjectTabs'
import { ProjectStatusControl } from '@/features/projects/components/ProjectStatusControl'
import { ProjectProgressBar } from '@/features/projects/components/ProjectProgressBar'
import { ProjectHeader } from '@/features/projects/components/ProjectHeader'
import { isNotFoundError } from '@/lib/errors'

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
    // Log the actual error for debugging
    console.error('[Project Page Error]', {
      projectId: id,
      error: error instanceof Error ? error.message : JSON.stringify(error, null, 2),
      stack: error instanceof Error ? error.stack : undefined,
    })
    // Only show 404 for actual not-found errors, let error boundary handle others
    if (isNotFoundError(error)) {
      notFound()
    }
    throw error
  }

  // Fetch available devs for admin assignment
  const availableDevs = profile.role === 'admin' ? await getAvailableDevs() : []

  const isAdmin = profile.role === 'admin' || profile.role === 'internal'

  return (
    <div className="space-y-6">
      {/* Header with Delivery Badge */}
      <ProjectHeader project={project} isAdmin={isAdmin} />

      {/* Progress Summary */}
      <div className="rounded-lg border bg-card p-4">
        <ProjectProgressBar project={project} variant="detailed" />
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

import { notFound } from 'next/navigation'
import { getProject, getAvailableDevs } from '@/lib/api/projects'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { ProjectPageClient } from '@/features/projects/components/ProjectPageClient'
import { isNotFoundError } from '@/lib/errors'
import { getPendingScopeChangesCount } from '@/lib/api/scope-monitoring'
import { getDelaySummary } from '@/lib/api/project-delays'
import { getProjectTestingInfo } from '@/lib/api/testing'
import type { TestingInfo } from '@/lib/api/testing'

// Force dynamic rendering - never cache this page
export const dynamic = 'force-dynamic'

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

  // Fetch available devs, pending scope changes, delay summary, and testing info
  const [availableDevs, pendingScopeChanges, delaySummary, testingInfoMap] = await Promise.all([
    profile.role === 'admin' ? getAvailableDevs() : Promise.resolve([]),
    getPendingScopeChangesCount(id).catch(() => 0),
    getDelaySummary(id).catch(() => ({ client_delay_days: 0, dev_delay_days: 0, total_delay_days: 0 })),
    getProjectTestingInfo(id).catch(() => new Map()),
  ])

  // Convert Map to plain object for serialization across server/client boundary
  const testingInfo = Object.fromEntries(testingInfoMap) as Record<string, TestingInfo>

  const isAdmin = profile.role === 'admin' || profile.role === 'internal'

  // Use delivery_date_override if set, otherwise fall back to target_delivery_date
  const effectiveDeliveryDate = project.delivery_date_override || project.target_delivery_date

  return (
    <ProjectPageClient
      project={project}
      userRole={profile.role}
      userId={profile.id}
      availableDevs={availableDevs}
      pendingScopeChanges={pendingScopeChanges}
      delaySummary={delaySummary}
      testingInfo={testingInfo}
      isAdmin={isAdmin}
      effectiveDeliveryDate={effectiveDeliveryDate}
    />
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { TestingQueue } from '@/features/testing/components/TestingQueue'
import { TestingModal } from '@/features/testing/components/TestingModal'
import { getTestingQueueAction } from '@/features/testing/actions/testingActions'
import type { DeliverableTestSummary } from '@/lib/api/testing'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'

interface TestingTabProps {
  project: ProjectWithRelations
  userRole: UserRole
  userId: string
}

export function TestingTab({ project, userRole, userId }: TestingTabProps) {
  const [queue, setQueue] = useState<{
    readyForDev: DeliverableTestSummary[]
    readyForAdminInt: DeliverableTestSummary[]
    readyForClient: DeliverableTestSummary[]
    inProgress: DeliverableTestSummary[]
  }>({
    readyForDev: [],
    readyForAdminInt: [],
    readyForClient: [],
    inProgress: [],
  })
  const [loading, setLoading] = useState(true)
  const [selectedDeliverable, setSelectedDeliverable] = useState<DeliverableTestSummary | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const isAdmin = userRole === 'admin' || userRole === 'internal'
  const isDev = userRole === 'dev'
  const isClient = userRole === 'client' || userRole === 'dfy'

  useEffect(() => {
    loadQueue()
  }, [project.id])

  const loadQueue = async () => {
    setLoading(true)
    try {
      const data = await getTestingQueueAction()
      const projectDeliverableIds = (project.deliverables || []).map((d: any) => d.id)

      const filterByProject = (items: DeliverableTestSummary[]) =>
        items.filter(item => projectDeliverableIds.includes(item.deliverable_id))

      setQueue({
        readyForDev: filterByProject(data.readyForDev),
        readyForAdminInt: filterByProject(data.readyForAdminInt),
        readyForClient: filterByProject(data.readyForClient),
        inProgress: filterByProject(data.inProgress),
      })
    } catch (error) {
      console.error('Failed to load testing queue:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTesting = (deliverable: DeliverableTestSummary) => {
    setSelectedDeliverable(deliverable)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedDeliverable(null)
    loadQueue()
  }

  const visibleQueue = {
    readyForDev: isDev ? queue.readyForDev : [],
    readyForAdminInt: isAdmin ? queue.readyForAdminInt : [],
    readyForClient: isClient ? queue.readyForClient : [],
    inProgress: queue.inProgress.filter(d => {
      if (d.dev_status === 'in_progress' && isDev) return true
      if (d.admin_int_status === 'in_progress' && isAdmin) return true
      if (d.client_status === 'in_progress' && isClient) return true
      return false
    }),
  }

  const totalReady =
    visibleQueue.readyForDev.length +
    visibleQueue.readyForAdminInt.length +
    visibleQueue.readyForClient.length +
    visibleQueue.inProgress.length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading testing queue...</div>
      </div>
    )
  }

  if (totalReady === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Testing Queue</CardTitle>
          <CardDescription>
            Deliverables appear here when they reach 90% completion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No deliverables ready for testing</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              When deliverables reach 90% completion, they will appear here for testing.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Testing Queue</h2>
            <p className="text-muted-foreground">
              {totalReady} deliverable{totalReady !== 1 ? 's' : ''} ready for testing
            </p>
          </div>
        </div>

        <TestingQueue
          queue={visibleQueue}
          userRole={userRole}
          onStartTesting={handleStartTesting}
        />
      </div>

      {selectedDeliverable && (
        <TestingModal
          deliverable={selectedDeliverable}
          open={modalOpen}
          onClose={handleModalClose}
          userRole={userRole}
          userId={userId}
        />
      )}
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  const [error, setError] = useState<string | null>(null)
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
    setError(null)
    try {
      const data = await getTestingQueueAction(project.id)
      // No client-side filtering needed - server already filters by project
      setQueue(data)
    } catch (err) {
      console.error('Failed to load testing queue:', err)
      setError('Failed to load testing queue. Please try again.')
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

  if (error) {
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
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadQueue} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
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

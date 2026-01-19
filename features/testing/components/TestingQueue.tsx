'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlayCircle, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeliverableTestSummary, TestStatus } from '@/lib/api/testing'
import type { UserRole } from '@/lib/auth/types'

interface TestingQueueProps {
  queue: {
    readyForDev: DeliverableTestSummary[]
    readyForAdminInt: DeliverableTestSummary[]
    readyForClient: DeliverableTestSummary[]
    inProgress: DeliverableTestSummary[]
  }
  userRole: UserRole
  onStartTesting: (deliverable: DeliverableTestSummary) => void
}

const statusColors: Record<TestStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  passed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  escalated: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
}

export function TestingQueue({ queue, userRole, onStartTesting }: TestingQueueProps) {
  const renderSection = (
    title: string,
    items: DeliverableTestSummary[],
    icon: React.ReactNode
  ) => {
    if (items.length === 0) return null

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="secondary">{items.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.map((item) => (
              <TestingQueueItem
                key={item.deliverable_id}
                item={item}
                userRole={userRole}
                onStartTesting={onStartTesting}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {renderSection(
        'Ready for Your Testing',
        [...queue.readyForDev, ...queue.readyForAdminInt, ...queue.readyForClient].filter(d => {
          if (userRole === 'dev' && queue.readyForDev.some(rd => rd.deliverable_id === d.deliverable_id)) {
            return d.next_stage === 'dev'
          }
          if ((userRole === 'admin' || userRole === 'internal') && d.next_stage === 'admin_int') {
            return true
          }
          if ((userRole === 'client' || userRole === 'dfy') && d.next_stage === 'client') {
            return true
          }
          return false
        }),
        <PlayCircle key="play" className="h-5 w-5 text-primary" />
      )}

      {renderSection(
        'In Progress',
        queue.inProgress,
        <Clock key="clock" className="h-5 w-5 text-blue-500" />
      )}

      {renderSection(
        'Recently Passed',
        [...queue.readyForAdminInt, ...queue.readyForClient].filter(d =>
          d.dev_status === 'passed' || d.admin_int_status === 'passed'
        ),
        <CheckCircle2 key="check" className="h-5 w-5 text-green-500" />
      )}
    </div>
  )
}

interface TestingQueueItemProps {
  item: DeliverableTestSummary
  userRole: UserRole
  onStartTesting: (deliverable: DeliverableTestSummary) => void
}

function TestingQueueItem({ item, userRole, onStartTesting }: TestingQueueItemProps) {
  const canStart = item.is_ready_for_next && item.next_stage

  const relevantStage = userRole === 'dev' ? 'dev' :
                       (userRole === 'admin' || userRole === 'internal') ? 'admin_int' : 'client'

  const stageStatus = item[relevantStage + '_status' as keyof DeliverableTestSummary] as TestStatus

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium truncate">{item.deliverable_title}</h4>
          {stageStatus && (
            <Badge variant="outline" className={cn('text-xs', statusColors[stageStatus])}>
              {stageStatus.replace('_', ' ')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Dev: {getStatusBadge(item.dev_status)}</span>
          <span>QA: {getStatusBadge(item.admin_int_status)}</span>
          <span>Client: {getStatusBadge(item.client_status)}</span>
        </div>
      </div>
      {canStart && (
        <Button
          size="sm"
          variant="default"
          onClick={() => onStartTesting(item)}
          className="ml-2"
        >
          <PlayCircle className="h-4 w-4 mr-1" />
          Start Testing
        </Button>
      )}
    </div>
  )
}

function getStatusBadge(status: TestStatus): React.ReactNode {
  return (
    <Badge variant="outline" className={cn('text-xs', statusColors[status])}>
      {status === 'passed' && '✓'}
      {status === 'failed' && '✗'}
      {status === 'in_progress' && '⋯'}
      {status === 'pending' && '○'}
    </Badge>
  )
}

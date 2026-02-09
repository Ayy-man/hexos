'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Clock } from 'lucide-react'
import { getRetainerCheckIns, getNextCheckInDueDate, type RetainerCheckIn } from '@/lib/api/retainer-check-ins'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import { LogCheckInDialog } from './LogCheckInDialog'
import { RetainerConfigDialog } from './RetainerConfigDialog'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckInsTabProps {
  project: ProjectWithRelations
  userRole: UserRole
}

export function CheckInsTab({ project, userRole }: CheckInsTabProps) {
  const [checkIns, setCheckIns] = useState<RetainerCheckIn[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dueInfo, setDueInfo] = useState<{ dueDate: string; isOverdue: boolean } | null>(null)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)

  const isAdmin = userRole === 'admin'

  const loadCheckIns = async () => {
    setIsLoading(true)
    try {
      const [data, due] = await Promise.all([
        getRetainerCheckIns(project.id),
        getNextCheckInDueDate(project.id).catch(() => null),
      ])
      setCheckIns(data)
      setDueInfo(due)
    } catch (error) {
      console.error('[CheckInsTab] Error loading check-ins:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadCheckIns()
  }, [project.id])

  const handleCheckInSuccess = () => {
    void loadCheckIns()
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'green':
        return 'bg-green-500'
      case 'yellow':
        return 'bg-yellow-500'
      case 'red':
        return 'bg-red-500'
      default:
        return 'bg-stone-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Check-ins</h2>
          {dueInfo && (
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5',
                dueInfo.isOverdue && 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              )}
            >
              <Clock className="h-3 w-3" />
              Next due: {format(new Date(dueInfo.dueDate), 'MMM d, yyyy')}
              {dueInfo.isOverdue && ' (overdue)'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfigDialogOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={() => setLogDialogOpen(true)}>
            Log Check-in
          </Button>
        </div>
      </div>

      {/* Check-ins Timeline */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Loading check-ins...
        </div>
      ) : checkIns.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No check-ins yet. Log your first check-in.
        </div>
      ) : (
        <div className="space-y-4">
          {checkIns.map((checkIn) => (
            <CheckInItem key={checkIn.id} checkIn={checkIn} getHealthColor={getHealthColor} />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <LogCheckInDialog
        projectId={project.id}
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        onSuccess={handleCheckInSuccess}
      />

      {isAdmin && (
        <RetainerConfigDialog
          project={project}
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          availableDevs={[]}
        />
      )}
    </div>
  )
}

function CheckInItem({
  checkIn,
  getHealthColor,
}: {
  checkIn: RetainerCheckIn
  getHealthColor: (health: string) => string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const notesLength = checkIn.notes?.length || 0
  const shouldCollapse = notesLength > 200

  return (
    <div className="flex gap-4 rounded-lg border p-4">
      {/* Health dot */}
      <div className={cn('mt-1 h-3 w-3 rounded-full flex-shrink-0', getHealthColor(checkIn.health))} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {format(new Date(checkIn.created_at), 'MMM d, yyyy')}
          </span>
          <span className="text-xs text-muted-foreground">
            ({formatDistanceToNow(new Date(checkIn.created_at), { addSuffix: true })})
          </span>
        </div>
        <div className="text-sm text-muted-foreground mb-1">
          {checkIn.submitter?.name || 'Unknown'}
        </div>
        {checkIn.notes && (
          shouldCollapse ? (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                {isExpanded ? 'Hide' : 'Show'} notes
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="text-sm whitespace-pre-wrap">{checkIn.notes}</div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="text-sm whitespace-pre-wrap">{checkIn.notes}</div>
          )
        )}
      </div>
    </div>
  )
}

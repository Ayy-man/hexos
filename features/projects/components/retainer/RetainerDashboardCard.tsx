'use client'

import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { RetainerCheckIn } from '@/lib/api/retainer-check-ins'
import { cn } from '@/lib/utils'

interface RetainerDashboardCardProps {
  project: ProjectWithRelations
  lastCheckIn?: RetainerCheckIn | null
  dueInfo?: { dueDate: string; isOverdue: boolean } | null
  taskCounts?: { todo: number; in_progress: number; done: number; total: number }
}

export function RetainerDashboardCard({
  project,
  lastCheckIn,
  dueInfo,
  taskCounts,
}: RetainerDashboardCardProps) {
  const getHealthColor = (health?: string) => {
    switch (health) {
      case 'green':
        return 'bg-green-500'
      case 'yellow':
        return 'bg-yellow-500'
      case 'red':
        return 'bg-red-500'
      default:
        return 'bg-stone-300 dark:bg-stone-600'
    }
  }

  const openTaskCount = (taskCounts?.todo || 0) + (taskCounts?.in_progress || 0)

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="py-3 hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-0 px-4">
          <div className="space-y-3">
            {/* Header with health indicator */}
            <div className="flex items-start gap-3">
              <div className={cn('mt-1 h-3 w-3 rounded-full flex-shrink-0', getHealthColor(lastCheckIn?.health))} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{project.project_name}</h3>
                {project.dfy_partner && (
                  <p className="text-sm text-muted-foreground truncate">
                    {project.dfy_partner.name}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2 text-sm">
              {/* Last check-in */}
              {lastCheckIn ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last check-in:</span>
                  <span>
                    {formatDistanceToNow(new Date(lastCheckIn.created_at), { addSuffix: true })}
                    {lastCheckIn.submitter && ` by ${lastCheckIn.submitter.name}`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last check-in:</span>
                  <span className="text-muted-foreground">None yet</span>
                </div>
              )}

              {/* Next due */}
              {dueInfo && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Next due:</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1',
                      dueInfo.isOverdue && 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {format(new Date(dueInfo.dueDate), 'MMM d')}
                    {dueInfo.isOverdue && ' (overdue)'}
                  </Badge>
                </div>
              )}

              {/* Open tasks */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Open tasks:</span>
                <span className="font-medium">{openTaskCount}</span>
              </div>
            </div>

            {/* Team avatars */}
            {project.retainer_dev_ids && project.retainer_dev_ids.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Team:</span>
                <div className="flex -space-x-2">
                  {project.retainer_dev_ids.slice(0, 3).map((devId, index) => (
                    <div
                      key={devId}
                      className="h-6 w-6 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300 flex items-center justify-center text-xs font-medium border-2 border-white dark:border-stone-900"
                      title={`Team member ${index + 1}`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                  ))}
                  {project.retainer_dev_ids.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 flex items-center justify-center text-xs font-medium border-2 border-white dark:border-stone-900">
                      +{project.retainer_dev_ids.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

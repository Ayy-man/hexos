'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CompactSparkline } from './CompactSparkline'
import { getZone, getDeadlineInfo } from './utils'
import type { ParentCardProps } from './types'

export function ParentDeliverableCard({ item, onClick }: ParentCardProps) {
  const zone = getZone(item.x)
  const deadline = getDeadlineInfo(item.deadline, item.x)

  // Dynamic dot color: red if overdue, green if done, amber if in-progress
  const dotColor = deadline.isOverdue
    ? 'bg-red-500'
    : item.x >= 90
      ? 'bg-green-500'
      : 'bg-amber-500'

  // Get first and last values for labels
  const historyCount = item.history?.length || 0
  const firstValue = item.history?.[0]?.x ?? item.x
  const currentValue = item.x

  return (
    <Card
      className={cn(
        'cursor-pointer overflow-hidden border-border bg-card dark:border-border dark:bg-card py-0 gap-0 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-muted/50 dark:hover:bg-muted/50',
        deadline.isOverdue && 'border-red-500/40'
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
          <div
            className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dotColor)}
          />
          <span className="flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {item.name}
          </span>
          {item.subCount > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">({item.subCount})</span>
          )}
        </div>

        {/* Status row */}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <Badge
            variant="outline"
            className={cn('border-0 text-xs', zone.bgClass, zone.colorClass)}
          >
            {zone.label}
          </Badge>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {Math.round(item.x)}%
          </span>
          {/* Updates count */}
          {historyCount > 0 && (
            <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
              {historyCount} update{historyCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Sparkline with labels */}
        <div className="border-t border-border bg-muted/50 dark:border-border dark:bg-background/50 px-3 pt-2 pb-1">
          <CompactSparkline
            history={item.history}
            currentX={item.x}
            color={item.color}
            width={230}
            height={44}
          />
          {/* Bottom labels - first % and current % */}
          <div className="flex justify-between px-1 pb-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {Math.round(firstValue)}%
            </span>
            <span className={cn('text-xs font-medium', zone.colorClass)}>
              {Math.round(currentValue)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

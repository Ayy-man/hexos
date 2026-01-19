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

  // Get first and last values for labels
  const historyCount = item.history?.length || 0
  const firstValue = item.history?.[0]?.x ?? item.x
  const currentValue = item.x

  return (
    <Card
      className={cn(
        'cursor-pointer overflow-hidden border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
        deadline.isOverdue && 'border-red-500/40'
      )}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!deadline.isOverdue) {
          e.currentTarget.style.borderColor = item.color
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = deadline.isOverdue
          ? 'rgba(239, 68, 68, 0.4)'
          : ''
      }}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
          <div
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: item.color }}
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
        <div className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50 px-3 pt-2 pb-1">
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
            <span className="text-xs font-medium" style={{ color: item.color }}>
              {Math.round(currentValue)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

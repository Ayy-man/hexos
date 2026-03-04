'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { ExpandedSparkline } from './ExpandedSparkline'
import { getZone, getDeadlineInfo, wasLoggedToday } from './utils'
import type { SubDeliverableCardProps } from './types'

export function SubDeliverableCard({
  item,
  testing,
  onQuickUpdate,
  isLoading = false,
  disabled = false,
}: SubDeliverableCardProps) {
  const zone = getZone(item.x)
  const deadline = getDeadlineInfo(item.deadline, item.x)
  const loggedToday = wasLoggedToday(item.history)

  // Calculate max allowed position based on lock status
  // If locked, use unlockPosition (default 90), otherwise allow up to 100
  const maxPosition = testing?.isLocked ? (testing.unlockPosition ?? 90) : 100

  // Dynamic dot color: red if overdue, green if done, amber if in-progress
  const dotColor = deadline.isOverdue
    ? 'bg-red-500'
    : item.x >= 90
      ? 'bg-green-500'
      : 'bg-amber-500'

  return (
    <Card
      className={cn(
        'overflow-hidden border-border bg-card dark:border-border dark:bg-card py-0 gap-0',
        deadline.isOverdue && 'border-red-500/40'
      )}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <div
            className={cn('h-3 w-3 shrink-0 rounded-full', dotColor)}
          />
          <span className="flex-1 truncate font-medium text-zinc-900 dark:text-zinc-100">
            {item.name}
          </span>
        </div>

        {/* Status row */}
        <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
          <Badge variant="outline" className={cn('border-0 text-xs', zone.bgClass, zone.colorClass)}>
            {zone.label}
          </Badge>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{Math.round(item.x)}%</span>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              loggedToday
                ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                : 'border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500'
            )}
          >
            {loggedToday ? (
              <>
                <Check className="mr-1 h-3 w-3" />
                Logged today
              </>
            ) : (
              'No update today'
            )}
          </Badge>
          {deadline.label && (
            <Badge
              variant="outline"
              className={cn(
                'ml-auto text-xs',
                deadline.isOverdue
                  ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                  : deadline.daysRemaining !== null && deadline.daysRemaining <= 2
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500'
              )}
            >
              {deadline.label}
            </Badge>
          )}
        </div>

        {/* Sparkline - full width, no extra container */}
        <div className="border-t border-border bg-muted/50 dark:border-border dark:bg-background/50 px-2 py-3">
          <ExpandedSparkline
            history={item.history}
            currentX={item.x}
            color={item.color}
            width={360}
            height={100}
          />
        </div>

        {/* Quick update buttons */}
        <div className="grid grid-cols-4 gap-2 border-t border-border bg-muted/50 dark:border-border dark:bg-background/30 p-4">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isLoading || item.x <= 0}
            onClick={() => onQuickUpdate(item.id, Math.max(0, item.x - 5))}
            className="border-red-500/20 bg-red-500/5 font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
          >
            -5%
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isLoading}
            onClick={() => onQuickUpdate(item.id, item.x)}
            className="border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            0%
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isLoading || item.x >= maxPosition}
            onClick={() => onQuickUpdate(item.id, Math.min(maxPosition, item.x + 5))}
            className="border-green-500/20 bg-green-500/5 font-medium text-green-600 dark:text-green-400 hover:bg-green-500/10 hover:text-green-700 dark:hover:text-green-300"
          >
            +5%
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isLoading || item.x >= maxPosition}
            onClick={() => onQuickUpdate(item.id, Math.min(maxPosition, item.x + 10))}
            className="border-cyan-500/20 bg-cyan-500/5 font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-300"
          >
            +10%
          </Button>
        </div>

      </CardContent>
    </Card>
  )
}

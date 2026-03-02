'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  ACTIVITY_LABELS,
  FILTER_CHIPS,
  EMPTY_FILTER_MESSAGES,
  getCategoryConfig,
  formatActivityDetail,
  groupByDay,
  formatExactTime,
  formatRelativeTime,
  type FilterCategory,
} from './activity-utils'

interface ActivityEntry {
  id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
  user?: { name: string } | null
}

interface ActivityTabProps {
  activity: ActivityEntry[]
  projectId: string
  requirements?: Array<{ id: string; title: string }>
}

export function ActivityTab({ activity, projectId, requirements }: ActivityTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all')
  const [displayCount, setDisplayCount] = useState(25)

  const filteredActivity = useMemo(() => {
    if (activeFilter === 'all') return activity
    return activity.filter((entry) => {
      const config = getCategoryConfig(entry.action)
      return config.filterGroup === activeFilter
    })
  }, [activity, activeFilter])

  const visibleActivity = filteredActivity.slice(0, displayCount)
  const hasMore = filteredActivity.length > displayCount

  const dayGroups = useMemo(() => groupByDay(visibleActivity), [visibleActivity])

  // Zero total activity — encouraging empty state
  if (activity.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            Activity will appear here as your project progresses.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Activity Timeline</CardTitle>
      </CardHeader>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap px-6 pb-4">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => {
              setActiveFilter(chip.value)
              setDisplayCount(25)
            }}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              activeFilter === chip.value
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Filtered empty state */}
      {filteredActivity.length === 0 && activity.length > 0 && (
        <CardContent className="pb-8">
          <p className="text-center text-muted-foreground text-sm">
            {EMPTY_FILTER_MESSAGES[activeFilter]}
          </p>
        </CardContent>
      )}

      {/* Timeline content */}
      {filteredActivity.length > 0 && (
        <CardContent>
          <TooltipProvider>
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

              {dayGroups.map((group) => (
                <div key={group.label}>
                  {/* Date separator */}
                  <div className="relative flex items-center gap-4 py-2 pl-9">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Entries */}
                  {group.entries.map((entry) => {
                    const config = getCategoryConfig(entry.action)
                    const Icon = config.icon
                    const detail = formatActivityDetail(
                      entry.action,
                      entry.details,
                      projectId,
                      requirements
                    )
                    const actionLabel =
                      ACTIVITY_LABELS[entry.action] ??
                      entry.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

                    return (
                      <div
                        key={entry.id}
                        className="group relative flex gap-3 -mx-2 px-2 py-2 hover:bg-muted/50 rounded-md transition-colors"
                        style={{ paddingLeft: 'calc(36px + 8px)' }}
                      >
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            'absolute left-0 top-2 h-[30px] w-[30px] rounded-full flex items-center justify-center flex-shrink-0',
                            config.bgClass
                          )}
                        >
                          <Icon className={cn('h-3.5 w-3.5', config.colorClass)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Top line: action + timestamp */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">{actionLabel}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground cursor-default flex-shrink-0">
                                  {formatRelativeTime(entry.created_at)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {formatExactTime(entry.created_at)}
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          {/* User line */}
                          {entry.user && (
                            <p className="text-xs text-muted-foreground">by {entry.user.name}</p>
                          )}

                          {/* Detail line */}
                          {detail !== null && (
                            <div className="mt-0.5 text-sm text-muted-foreground">{detail}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => setDisplayCount((prev) => prev + 25)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Load more ({filteredActivity.length - displayCount} remaining)
                  </button>
                </div>
              )}
            </div>
          </TooltipProvider>
        </CardContent>
      )}
    </Card>
  )
}

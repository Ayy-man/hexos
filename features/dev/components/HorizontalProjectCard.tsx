'use client'

import Link from 'next/link'
import { DollarSign, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { InlineSparkline, type ActivityDataPoint } from '@/components/shared/ActivitySparkline'
import { cn } from '@/lib/utils'
import { getStatusConfig } from '@/lib/utils/status'

interface Deliverable {
  id: string
  title: string
  status: string
  due_date: string | null
}

interface HorizontalProjectCardProps {
  id: string
  projectName: string
  clientName: string
  status: string
  deliverables: Deliverable[]
  expectedPayout: number | null
  targetDeliveryDate: string | null
  activityTrend: ActivityDataPoint[]
  className?: string
}

function formatCurrency(amount: number | null) {
  if (!amount) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function HorizontalProjectCard({
  id,
  projectName,
  clientName,
  status,
  deliverables,
  expectedPayout,
  targetDeliveryDate,
  activityTrend,
  className,
}: HorizontalProjectCardProps) {
  const done = deliverables.filter((d) => d.status === 'done').length
  const inProgress = deliverables.filter((d) => d.status === 'in_progress').length
  const total = deliverables.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  // Get top 4 deliverables to show inline, prioritize non-done
  const sortedDeliverables = [...deliverables].sort((a, b) => {
    const order: Record<string, number> = { in_progress: 0, blocked: 1, pending: 2, done: 3 }
    return (order[a.status] ?? 2) - (order[b.status] ?? 2)
  })
  const visibleDeliverables = sortedDeliverables.slice(0, 4)
  const remainingCount = deliverables.length - 4

  const statusConfig = getStatusConfig(status)
  const hasFooterContent = expectedPayout || activityTrend.length > 0

  return (
    <Link href={`/projects/${id}`}>
      <Card
        className={cn(
          'w-[340px] flex-shrink-0 transition-colors cursor-pointer group hover:bg-bg-hover',
          className
        )}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header: Project name + Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate group-hover:text-foreground transition-colors">
                {projectName}
              </p>
              <p className="text-xs text-text-tertiary truncate">{clientName}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`w-[7px] h-[7px] rounded-full inline-block ${statusConfig.classes.dot}`} />
              <span className={`text-[10px] font-mono uppercase tracking-wider ${statusConfig.classes.text}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Progress</span>
              <div className="flex items-center gap-2">
                {inProgress > 0 && (
                  <span className="text-accent text-[10px]">
                    {inProgress} active
                  </span>
                )}
                <span className="font-semibold tabular-nums">
                  {done}/{total}
                </span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Inline deliverables */}
          {visibleDeliverables.length > 0 && (
            <div className="space-y-1.5">
              {visibleDeliverables.map((d) => {
                const config = getStatusConfig(d.status)
                return (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-[7px] h-[7px] rounded-full inline-block shrink-0 ${config.classes.dot}`} />
                    <span className="truncate text-text-secondary">{d.title}</span>
                  </div>
                )
              })}
              {remainingCount > 0 && (
                <p className="text-[11px] text-text-ghost pl-5">
                  +{remainingCount} more
                </p>
              )}
            </div>
          )}

          {/* Footer: Payout + Activity sparkline */}
          {hasFooterContent && (
            <div className="flex items-center justify-between pt-2 border-t border-border-hairline">
              {expectedPayout ? (
                <div className="flex items-center gap-1 text-signal-good">
                  <DollarSign className="h-3 w-3" />
                  <span className="text-xs font-semibold tabular-nums">
                    {formatCurrency(expectedPayout)}
                  </span>
                </div>
              ) : (
                <div />
              )}
              {activityTrend.length > 0 && (
                <InlineSparkline data={activityTrend} color="primary" />
              )}
            </div>
          )}

          {/* Hover indicator */}
          <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity -mt-1">
            <span className="text-[10px] text-text-ghost flex items-center gap-0.5">
              View project <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

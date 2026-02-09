'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, Clock, AlertCircle, DollarSign, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { InlineSparkline, type ActivityDataPoint } from '@/components/shared/ActivitySparkline'
import { cn } from '@/lib/utils'

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

const STATUS_ICONS: Record<string, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  done: CheckCircle2,
  blocked: AlertCircle,
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-stone-400 dark:text-stone-500',
  in_progress: 'text-cyan-500',
  done: 'text-green-500',
  blocked: 'text-red-500',
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
  inquiry: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
  accepted: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
  blocked_client: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  blocked_internal: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  retainer: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
}

const STATUS_ACCENT: Record<string, string> = {
  pending: 'border-l-stone-300 dark:border-l-stone-600',
  inquiry: 'border-l-stone-300 dark:border-l-stone-600',
  accepted: 'border-l-cyan-500',
  in_progress: 'border-l-cyan-500',
  blocked_client: 'border-l-red-500',
  blocked_internal: 'border-l-red-500',
  completed: 'border-l-green-500',
  retainer: 'border-l-violet-500',
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

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
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

  const badgeStyle = STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.pending
  const accentStyle = STATUS_ACCENT[status] || STATUS_ACCENT.pending
  const hasFooterContent = expectedPayout || activityTrend.length > 0

  return (
    <Link href={`/projects/${id}`}>
      <Card
        className={cn(
          'w-[340px] flex-shrink-0 transition-all cursor-pointer border-l-4 group',
          'hover:shadow-md hover:border-l-4',
          accentStyle,
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
              <p className="text-xs text-muted-foreground truncate">{clientName}</p>
            </div>
            <Badge
              variant="secondary"
              className={cn('text-[10px] capitalize flex-shrink-0 border-0', badgeStyle)}
            >
              {formatStatus(status)}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <div className="flex items-center gap-2">
                {inProgress > 0 && (
                  <span className="text-cyan-600 dark:text-cyan-400 text-[10px]">
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
                const Icon = STATUS_ICONS[d.status] || Circle
                const colorClass = STATUS_COLORS[d.status] || 'text-muted-foreground'
                return (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', colorClass)} />
                    <span className="truncate text-foreground/80">{d.title}</span>
                  </div>
                )
              })}
              {remainingCount > 0 && (
                <p className="text-[11px] text-muted-foreground pl-5">
                  +{remainingCount} more
                </p>
              )}
            </div>
          )}

          {/* Footer: Payout + Activity sparkline */}
          {hasFooterContent && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              {expectedPayout ? (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
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
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              View project <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

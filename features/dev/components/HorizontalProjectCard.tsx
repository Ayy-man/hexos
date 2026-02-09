'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, Clock, AlertCircle, DollarSign } from 'lucide-react'
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
  pending: 'text-muted-foreground',
  in_progress: 'text-cyan-500',
  done: 'text-green-500',
  blocked: 'text-red-500',
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
  const total = deliverables.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  // Get top 4 deliverables to show inline
  const visibleDeliverables = deliverables.slice(0, 4)
  const remainingCount = deliverables.length - 4

  return (
    <Link href={`/projects/${id}`}>
      <Card
        className={cn(
          'w-[320px] flex-shrink-0 hover:bg-muted/50 transition-colors cursor-pointer',
          className
        )}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header: Project name + Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{projectName}</p>
              <p className="text-xs text-muted-foreground truncate">{clientName}</p>
            </div>
            <Badge variant="secondary" className="text-[10px] capitalize flex-shrink-0">
              {formatStatus(status)}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium tabular-nums">
                {done}/{total}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Inline deliverables */}
          {visibleDeliverables.length > 0 && (
            <div className="space-y-1">
              {visibleDeliverables.map((d) => {
                const Icon = STATUS_ICONS[d.status] || Circle
                const colorClass = STATUS_COLORS[d.status] || 'text-muted-foreground'
                return (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    <Icon className={cn('h-3 w-3 flex-shrink-0', colorClass)} />
                    <span className="truncate">{d.title}</span>
                  </div>
                )
              })}
              {remainingCount > 0 && (
                <p className="text-[10px] text-muted-foreground pl-5">
                  +{remainingCount} more
                </p>
              )}
            </div>
          )}

          {/* Footer: Payout + Activity sparkline */}
          <div className="flex items-center justify-between pt-1 border-t">
            {expectedPayout ? (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <DollarSign className="h-3 w-3" />
                <span className="text-xs font-medium tabular-nums">
                  {formatCurrency(expectedPayout)}
                </span>
              </div>
            ) : (
              <div />
            )}
            <InlineSparkline data={activityTrend} color="primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}


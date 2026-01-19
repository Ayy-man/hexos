'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Flag, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DelaySummary } from '@/lib/api/project-delays'

interface DelaySummaryWidgetProps {
  summary: DelaySummary
  className?: string
}

export function DelaySummaryWidget({ summary, className }: DelaySummaryWidgetProps) {
  if (summary.total_delay_days === 0) {
    return null
  }

  return (
    <Card className={cn('border-amber-200 dark:border-amber-800', className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Delays:</span>
          </div>

          <div className="flex items-center gap-4">
            {summary.client_delay_days > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm">
                  <span className="font-medium">{summary.client_delay_days}</span>
                  <span className="text-muted-foreground ml-1">
                    client day{summary.client_delay_days !== 1 ? 's' : ''}
                  </span>
                </span>
              </div>
            )}

            {summary.dev_delay_days > 0 && (
              <div className="flex items-center gap-1.5">
                <Flag className="h-4 w-4 text-red-500" />
                <span className="text-sm">
                  <span className="font-medium">{summary.dev_delay_days}</span>
                  <span className="text-muted-foreground ml-1">
                    dev day{summary.dev_delay_days !== 1 ? 's' : ''}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

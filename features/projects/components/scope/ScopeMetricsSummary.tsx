'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import type { ScopeMetrics } from '@/lib/types/scope-monitoring'
import { formatHoursDelta } from '@/lib/types/scope-monitoring'

interface ScopeMetricsSummaryProps {
  metrics: ScopeMetrics
  variant?: 'default' | 'compact'
}

export function ScopeMetricsSummary({ metrics, variant = 'default' }: ScopeMetricsSummaryProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 text-sm">
        {metrics.pending_changes > 0 && (
          <div className="flex items-center gap-1.5 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <span>{metrics.pending_changes} pending</span>
          </div>
        )}
        {metrics.approved_changes > 0 && (
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>{metrics.approved_changes} approved</span>
          </div>
        )}
        {metrics.net_hours_delta !== 0 && (
          <div className={`flex items-center gap-1.5 ${metrics.net_hours_delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
            <Clock className="h-4 w-4" />
            <span>{formatHoursDelta(metrics.net_hours_delta)}</span>
          </div>
        )}
        {metrics.total_changes === 0 && (
          <span className="text-muted-foreground">No scope changes</span>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Changes</p>
              <p className="text-2xl font-semibold">{metrics.total_changes}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-semibold">{metrics.pending_changes}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          {metrics.pending_changes > 0 && (
            <Badge variant="secondary" className="mt-2 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              Needs attention
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-semibold">{metrics.approved_changes}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Hours</p>
              <p className={`text-2xl font-semibold ${metrics.net_hours_delta > 0 ? 'text-red-600' : metrics.net_hours_delta < 0 ? 'text-green-600' : ''}`}>
                {formatHoursDelta(metrics.net_hours_delta)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          {metrics.net_hours_delta !== 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              From approved changes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

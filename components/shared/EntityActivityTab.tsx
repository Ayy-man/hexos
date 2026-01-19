'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Circle,
  Bot,
  ArrowLeftRight,
  FileText,
  CreditCard,
  MessageSquare,
  Shield,
  AlertCircle,
  Upload,
} from 'lucide-react'
import type { ActivityLogWithUser, ActivityLogCategory } from '@/lib/types/activity-logs'
import {
  formatActivityCategory,
  getActivityCategoryColor,
  formatActivityAction,
} from '@/lib/types/activity-logs'

interface EntityActivityTabProps {
  entityType: string
  entityId: string
  initialLogs?: ActivityLogWithUser[]
}

const categoryIcons: Record<ActivityLogCategory, React.ElementType> = {
  crud: FileText,
  auth: Shield,
  ai: Bot,
  payment: CreditCard,
  conversation: MessageSquare,
  status: ArrowLeftRight,
  file: Upload,
  error: AlertCircle,
}

export function EntityActivityTab({
  entityType,
  entityId,
  initialLogs,
}: EntityActivityTabProps) {
  const [logs, setLogs] = useState<ActivityLogWithUser[]>(initialLogs || [])
  const [loading, setLoading] = useState(!initialLogs)

  useEffect(() => {
    if (!initialLogs) {
      // Fetch logs client-side if not provided
      fetch(`/api/activity-logs?entity_type=${entityType}&entity_id=${entityId}&limit=50`)
        .then((res) => res.json())
        .then((data) => {
          setLogs(data.data || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [entityType, entityId, initialLogs])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Circle className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              No activity recorded for this {entityType}.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {logs.map((log) => {
              const Icon = categoryIcons[log.category] || Circle

              return (
                <div key={log.id} className="relative flex gap-4 pl-8">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1">
                    <div
                      className={`p-1.5 rounded-full border-2 border-background ${getActivityCategoryColor(
                        log.category
                      )}`}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={getActivityCategoryColor(log.category)}
                      >
                        {formatActivityCategory(log.category)}
                      </Badge>
                      <span className="font-medium text-sm">
                        {formatActivityAction(log.action)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span title={format(new Date(log.timestamp), 'PPpp')}>
                        {formatDistanceToNow(new Date(log.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                      {log.user && (
                        <>
                          <span>·</span>
                          <span>{log.user.name || log.user_email}</span>
                        </>
                      )}
                    </div>

                    {/* Show changes if present */}
                    {log.changes && Object.keys(log.changes).length > 0 && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                        {Object.entries(log.changes).map(([field, change]) => (
                          <div key={field} className="flex items-center gap-1">
                            <span className="text-muted-foreground">{field}:</span>
                            <span className="text-red-500 line-through text-xs">
                              {String(change.old)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-green-500 text-xs">
                              {String(change.new)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show AI details if present */}
                    {log.ai_tokens_used && (
                      <div className="mt-2 p-2 bg-cyan-50 dark:bg-cyan-950/30 rounded text-xs">
                        <span className="text-cyan-600 dark:text-cyan-400">
                          AI Query: {log.ai_tokens_used.toLocaleString()} tokens ·{' '}
                          {log.ai_latency_ms}ms
                        </span>
                      </div>
                    )}

                    {/* Show error details */}
                    {log.category === 'error' && log.error_stack && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 rounded">
                        <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto max-h-24">
                          {log.error_stack.split('\n').slice(0, 3).join('\n')}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

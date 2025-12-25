'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Circle } from 'lucide-react'

interface ActivityEntry {
  id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
  user?: { name: string } | null
}

interface ActivityTabProps {
  activity: ActivityEntry[]
}

function formatAction(action: string) {
  const actionMap: Record<string, string> = {
    project_created: 'Project created',
    status_changed: 'Status changed',
    deliverables_confirmed: 'Deliverables confirmed',
    signoff_sent: 'Sent for sign-off',
    signed_off: 'Deliverables signed off',
    file_uploaded: 'File uploaded',
    file_deleted: 'File deleted',
    requirement_completed: 'Requirement completed',
    dev_assigned: 'Developer assigned',
  }
  return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatRelativeTime(date: string) {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}

export function ActivityTab({ activity }: ActivityTabProps) {
  if (activity.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No activity recorded yet.
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
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {activity.map((entry, index) => (
              <div key={entry.id} className="relative flex gap-4 pl-6">
                {/* Timeline dot */}
                <div className="absolute left-0 top-1.5">
                  <Circle className="h-4 w-4 fill-background stroke-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatAction(entry.action)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(entry.created_at)}
                    </span>
                  </div>
                  {entry.user && (
                    <p className="text-sm text-muted-foreground">
                      by {entry.user.name}
                    </p>
                  )}
                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {'from' in entry.details && 'to' in entry.details && (
                        <span>
                          {String(entry.details.from).replace(/_/g, ' ')} → {String(entry.details.to).replace(/_/g, ' ')}
                        </span>
                      )}
                      {'file_name' in entry.details && (
                        <span>{String(entry.details.file_name)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

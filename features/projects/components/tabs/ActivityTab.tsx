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
    // Project lifecycle
    project_created: 'Project created',
    project_updated: 'Project updated',
    project_archived: 'Project archived',
    project_deleted: 'Project deleted',

    // Status changes
    status_changed: 'Status changed',
    phase_changed: 'Phase changed',

    // Sign-off flow
    deliverables_confirmed: 'Deliverables confirmed',
    signoff_sent: 'Sent for sign-off',
    signed_off: 'Deliverables signed off',
    baseline_captured: 'Scope baseline captured',

    // Deliverables
    deliverable_added: 'Deliverable added',
    deliverable_updated: 'Deliverable updated',
    deliverable_deleted: 'Deliverable deleted',
    deliverable_completed: 'Deliverable completed',

    // Hill chart
    hill_position_updated: 'Progress updated',

    // Scope changes
    scope_change_flagged: 'Scope change detected',
    scope_change_approved: 'Scope change approved',
    scope_change_rejected: 'Scope change rejected',

    // Requirements
    requirement_created: 'Requirement added',
    requirement_updated: 'Requirement updated',
    requirement_completed: 'Requirement completed',
    requirement_deleted: 'Requirement removed',

    // Files
    file_uploaded: 'File uploaded',
    file_deleted: 'File deleted',
    file_downloaded: 'File downloaded',

    // Team
    dev_assigned: 'Developer assigned',
    dev_unassigned: 'Developer unassigned',

    // Raw database operations (fallback for legacy logs)
    INSERT: 'Record created',
    UPDATE: 'Record updated',
    DELETE: 'Record deleted',
    insert: 'Record created',
    update: 'Record updated',
    delete: 'Record deleted',
  }
  return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDetails(details: Record<string, unknown> | null): React.ReactNode {
  if (!details || Object.keys(details).length === 0) return null

  // Status/phase change (from -> to)
  if ('from' in details && 'to' in details) {
    const from = String(details.from).replace(/_/g, ' ')
    const to = String(details.to).replace(/_/g, ' ')
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-muted-foreground">{from}</span>
        <span className="text-muted-foreground/60">→</span>
        <span className="font-medium">{to}</span>
      </span>
    )
  }

  // File operation
  if ('file_name' in details) {
    return <span className="font-mono text-xs">{String(details.file_name)}</span>
  }

  // Deliverable/entity name
  if ('title' in details || 'name' in details) {
    return <span>"{String(details.title || details.name)}"</span>
  }

  // Hours change
  if ('hours_before' in details && 'hours_after' in details) {
    return (
      <span>
        {String(details.hours_before)}h → {String(details.hours_after)}h
      </span>
    )
  }

  // Hill chart position change
  if ('position' in details) {
    return <span>{String(details.position)}%</span>
  }

  // Generic field change
  if ('field' in details && 'before' in details && 'after' in details) {
    return (
      <span>
        {String(details.field)}: {String(details.before)} → {String(details.after)}
      </span>
    )
  }

  return null
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
                  {entry.details && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatDetails(entry.details)}
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

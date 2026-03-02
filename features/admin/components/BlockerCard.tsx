'use client'

import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Blocker, BlockerPriority, BlockerStatus } from '@/lib/api/blockers'

const priorityColors: Record<BlockerPriority, string> = {
  critical: 'bg-signal-bad',
  high: 'bg-orange-500',
  medium: 'bg-signal-warn',
  low: 'bg-text-ghost',
}

const statusConfig: Record<BlockerStatus, { label: string; className: string }> = {
  reported: {
    label: 'New',
    className: 'bg-signal-warn-dim text-signal-warn border-transparent',
  },
  acknowledged: {
    label: 'Acknowledged',
    className: 'bg-accent-dim text-accent border-transparent',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-accent-dim text-accent border-transparent',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-signal-good-dim text-signal-good border-transparent',
  },
  closed: {
    label: 'Closed',
    className: 'bg-bg-hover text-text-tertiary border-transparent',
  },
}

interface BlockerCardProps {
  blocker: Blocker
  projectName?: string
  isSelected: boolean
  onClick: () => void
}

export function BlockerCard({ blocker, projectName, isSelected, onClick }: BlockerCardProps) {
  const status = statusConfig[blocker.status]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border bg-bg-card p-3 transition-colors hover:bg-bg-hover ${
        isSelected
          ? 'ring-1 ring-accent-border border-accent-border'
          : 'border-border-hairline'
      }`}
    >
      {/* Row 1: priority bar + title */}
      <div className="flex items-start gap-2">
        <div
          className={`mt-1.5 h-3 w-1 flex-shrink-0 rounded-full ${priorityColors[blocker.priority]}`}
        />
        <span className="font-medium text-text-primary truncate text-sm">
          {blocker.title}
        </span>
      </div>

      {/* Row 2: description preview */}
      {blocker.description && (
        <p className="mt-1 ml-3 text-xs text-text-secondary truncate">
          {blocker.description}
        </p>
      )}

      {/* Row 3: status + project + time + comments + reporter */}
      <div className="mt-1.5 ml-3 flex flex-wrap items-center gap-1.5 text-xs text-text-tertiary">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${status.className}`}>
          {status.label}
        </Badge>
        {projectName && (
          <span className="truncate max-w-[120px]">{projectName}</span>
        )}
        <span>&middot;</span>
        <span>{formatDistanceToNow(new Date(blocker.created_at), { addSuffix: false })}</span>
        {(blocker.comments_count ?? 0) > 0 && (
          <>
            <span>&middot;</span>
            <span className="inline-flex items-center gap-0.5">
              <MessageCircle className="h-3 w-3" />
              {blocker.comments_count}
            </span>
          </>
        )}
        {blocker.reporter?.name && (
          <>
            <span>&middot;</span>
            <span className="truncate max-w-[100px]">{blocker.reporter.name}</span>
          </>
        )}
      </div>
    </button>
  )
}

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
      className={`w-full text-left rounded-lg border bg-bg-card p-4 transition-colors hover:bg-bg-hover flex flex-col gap-2 ${
        isSelected
          ? 'ring-1 ring-accent-border border-accent-border'
          : 'border-border-hairline'
      }`}
    >
      {/* Row 1: priority dot + status badge + project name */}
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 flex-shrink-0 rounded-full ${priorityColors[blocker.priority]}`}
        />
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${status.className}`}>
          {status.label}
        </Badge>
        {projectName && (
          <span className="text-xs text-text-tertiary truncate ml-auto">{projectName}</span>
        )}
      </div>

      {/* Row 2: title (wraps up to 2 lines) */}
      <h3 className="font-semibold text-text-primary text-sm line-clamp-2 leading-snug">
        {blocker.title}
      </h3>

      {/* Row 3: description preview (2-3 lines) */}
      {blocker.description && (
        <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed">
          {blocker.description}
        </p>
      )}

      {/* Row 4: time + reporter + comments */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-tertiary mt-auto pt-1">
        <span>{formatDistanceToNow(new Date(blocker.created_at), { addSuffix: false })}</span>
        {blocker.reporter?.name && (
          <>
            <span>&middot;</span>
            <span className="truncate max-w-[100px]">{blocker.reporter.name}</span>
          </>
        )}
        {(blocker.comments_count ?? 0) > 0 && (
          <>
            <span>&middot;</span>
            <span className="inline-flex items-center gap-0.5">
              <MessageCircle className="h-3 w-3" />
              {blocker.comments_count}
            </span>
          </>
        )}
      </div>
    </button>
  )
}

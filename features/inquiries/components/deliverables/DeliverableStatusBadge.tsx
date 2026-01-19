'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DeliverableChangeStatus } from '@/lib/api/proposal-deliverables'

const STATUS_CONFIG: Record<
  DeliverableChangeStatus,
  { label: string; className: string }
> = {
  original: {
    label: 'Original',
    className:
      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  },
  edited: {
    label: 'Edited',
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  added: {
    label: 'Added',
    className:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  removed: {
    label: 'Removed',
    className:
      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  approved: {
    label: 'Approved',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  rejected: {
    label: 'Rejected',
    className:
      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  },
  countered: {
    label: 'Countered',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  counter_accepted: {
    label: 'Accepted',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  counter_rejected: {
    label: 'Counter Rejected',
    className:
      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  },
}

interface DeliverableStatusBadgeProps {
  status: DeliverableChangeStatus
  className?: string
}

export function DeliverableStatusBadge({
  status,
  className,
}: DeliverableStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}

// Helper to determine if a status needs review by admin
export function needsReview(status: DeliverableChangeStatus): boolean {
  return (
    status === 'edited' ||
    status === 'added' ||
    status === 'removed' ||
    status === 'counter_rejected'
  )
}

// Helper to determine if a status is final
export function isFinalStatus(status: DeliverableChangeStatus): boolean {
  return status === 'approved' || status === 'rejected' || status === 'counter_accepted'
}

// Helper to determine if DFY needs to respond to a counter
export function needsDfyResponse(status: DeliverableChangeStatus): boolean {
  return status === 'countered'
}

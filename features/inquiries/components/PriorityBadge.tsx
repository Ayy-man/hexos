'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Flag } from 'lucide-react'
import type { Priority } from '@/lib/api/inquiries'

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string; iconColor: string }> = {
  urgent: {
    label: 'Urgent',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    iconColor: 'text-red-500',
  },
  high: {
    label: 'High',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    iconColor: 'text-yellow-500',
  },
  normal: {
    label: 'Normal',
    className: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
    iconColor: 'text-stone-400',
  },
  low: {
    label: 'Low',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    iconColor: 'text-blue-500',
  },
}

interface PriorityBadgeProps {
  priority: Priority | null | undefined
  showLabel?: boolean
  className?: string
}

export function PriorityBadge({ priority, showLabel = true, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority || 'normal']

  if (!showLabel) {
    return (
      <Flag className={cn('h-4 w-4', config.iconColor, className)} />
    )
  }

  return (
    <Badge
      variant="secondary"
      className={cn('text-xs font-medium gap-1', config.className, className)}
    >
      <Flag className={cn('h-3 w-3', config.iconColor)} />
      {config.label}
    </Badge>
  )
}

export function getPriorityColor(priority: Priority | null | undefined): string {
  return PRIORITY_CONFIG[priority || 'normal'].iconColor
}

'use client'

import { Badge } from '@/components/ui/badge'
import { Heart, HeartHandshake, HeartOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommitmentStatus } from '@/lib/api/project-invitations'

interface CommitmentStatusBadgeProps {
  status: CommitmentStatus
  showLabel?: boolean
  size?: 'sm' | 'default'
}

const statusConfig: Record<
  Exclude<CommitmentStatus, null>,
  {
    icon: typeof Heart
    label: string
    className: string
  }
> = {
  interested: {
    icon: Heart,
    label: 'Interested',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100/80 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  committed: {
    icon: HeartHandshake,
    label: 'Committed',
    className: 'bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800',
  },
  declined: {
    icon: HeartOff,
    label: 'Declined',
    className: 'bg-gray-100 text-gray-600 hover:bg-gray-100/80 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  },
}

export function CommitmentStatusBadge({
  status,
  showLabel = true,
  size = 'default',
}: CommitmentStatusBadgeProps) {
  // Return null if no status
  if (!status) return null

  const config = statusConfig[status]
  const Icon = config.icon
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        size === 'sm' ? 'text-xs py-0 px-1.5' : 'text-xs py-0.5 px-2',
        config.className
      )}
    >
      <Icon className={cn(iconSize, showLabel && 'mr-1')} />
      {showLabel && config.label}
    </Badge>
  )
}

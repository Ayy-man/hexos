'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DelayType } from '@/lib/api/project-delays'

interface DelayTypeBadgeProps {
  type: DelayType
  className?: string
}

export function DelayTypeBadge({ type, className }: DelayTypeBadgeProps) {
  const isClientDelay = type === 'client_delay'

  return (
    <Badge
      variant="outline"
      className={cn(
        isClientDelay
          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300',
        className
      )}
    >
      {isClientDelay ? 'Client' : 'Dev'}
    </Badge>
  )
}

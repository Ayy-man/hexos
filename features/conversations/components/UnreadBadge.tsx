'use client'

import { cn } from '@/lib/utils'

interface UnreadBadgeProps {
  count: number
  className?: string
}

export function UnreadBadge({ count, className }: UnreadBadgeProps) {
  if (count <= 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground min-w-[18px]',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function UnreadDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full bg-primary',
        className
      )}
    />
  )
}

'use client'

import { formatLastSeen } from '@/lib/utils'

interface MemberStatusIndicatorProps {
  userId: string
  lastSeenAt: string | null
  onlineUserIds: Set<string>
}

export function MemberStatusIndicator({
  userId,
  lastSeenAt,
  onlineUserIds,
}: MemberStatusIndicatorProps) {
  const isOnline = onlineUserIds.has(userId)

  if (isOnline) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
        <span className="text-xs text-success font-medium">Online</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/50" />
      </span>
      <span className="text-xs text-muted-foreground">{formatLastSeen(lastSeenAt)}</span>
    </div>
  )
}

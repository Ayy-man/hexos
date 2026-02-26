'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  notificationSlot: React.ReactNode
  avatarSlot: React.ReactNode
  action?: React.ReactNode
  onSearchPress: () => void
}

export function MobileHeader({
  notificationSlot,
  avatarSlot,
  action,
  onSearchPress,
}: MobileHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-bg-surface border-b border-border-hairline',
        'pt-[env(safe-area-inset-top)]'
      )}
    >
      {/* Row 1 */}
      <div className="flex h-12 items-center px-4">
        <span className="font-semibold text-sm">hexOS</span>

        <div className="ml-auto flex items-center gap-2">
          {action}
          {notificationSlot}
          {avatarSlot}
        </div>
      </div>

      {/* Row 2 */}
      <div className="px-4 pb-2">
        <button
          type="button"
          onClick={onSearchPress}
          className="flex w-full items-center gap-2 rounded-lg bg-bg-void px-3 py-2 text-sm text-muted-foreground"
        >
          <Search className="h-4 w-4" />
          <span>Search...</span>
        </button>
      </div>
    </header>
  )
}

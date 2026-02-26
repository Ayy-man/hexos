'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileHeader } from './header'
import { MobileTabBar } from './tab-bar'
import { MobileMoreMenu } from './more-menu'
import { FloatingActionButton } from './fab'

interface MobileLayoutProps {
  role: 'admin' | 'internal' | 'dev' | 'dfy' | 'client'
  notificationSlot: React.ReactNode
  avatarSlot: React.ReactNode
  commandPaletteSlot: React.ReactNode
  onSearchOpen: () => void
  inquiryCount?: number
  conversationCount?: number
  children: React.ReactNode
}

export function MobileLayout({
  role,
  notificationSlot,
  avatarSlot,
  commandPaletteSlot,
  onSearchOpen,
  inquiryCount,
  conversationCount,
  children,
}: MobileLayoutProps) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  // Close More menu when navigating to a new page
  useEffect(() => {
    setShowMore(false)
  }, [pathname])

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-svh w-full flex-col">
      <MobileHeader
        notificationSlot={notificationSlot}
        avatarSlot={avatarSlot}
        onSearchPress={onSearchOpen}
      />
      {/* Hidden but mounted so command palette keyboard shortcut still works */}
      <div className="hidden">{commandPaletteSlot}</div>
      <main className="flex-1 bg-bg-void p-4 pb-20 overflow-auto">
        {showMore ? <MobileMoreMenu role={role} /> : children}
      </main>
      <FloatingActionButton role={role} />
      <MobileTabBar
        onMorePress={() => setShowMore((v) => !v)}
        isMoreActive={showMore}
        inquiryCount={inquiryCount}
        conversationCount={conversationCount}
      />
    </div>
  )
}

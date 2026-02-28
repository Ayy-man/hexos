'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useIsMobile } from '@/hooks/use-mobile'
import dynamic from 'next/dynamic'

const CommandPalette = dynamic(
  () => import('@/components/command-palette').then((m) => m.CommandPalette),
  { ssr: false }
)
import { MobileLayout } from './mobile-layout'
import { MobileAvatarMenu } from './avatar-menu'
import type { UserRole } from '@/lib/auth/types'

interface MobileShellProps {
  role: UserRole
  profileName: string
  profileEmail: string
  notificationSlot: React.ReactNode
  inquiryCount?: number
  conversationCount?: number
  /** The page content — rendered inside mobile layout on mobile */
  children: React.ReactNode
  /** The full desktop layout (sidebar + header + main wrapping children) — rendered as-is on desktop */
  desktopLayout: React.ReactNode
}

export function MobileShell({
  role,
  profileName,
  profileEmail,
  notificationSlot,
  inquiryCount,
  conversationCount,
  children,
  desktopLayout,
}: MobileShellProps) {
  const isMobile = useIsMobile()
  const [searchOpen, setSearchOpen] = useState(false)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  // Find the desktop notification target after mount
  useEffect(() => {
    if (!isMobile) {
      const el = document.getElementById('desktop-notification-target')
      if (el) setPortalTarget(el)
    } else {
      setPortalTarget(null)
    }
  }, [isMobile])

  // Desktop: render the full desktop layout with notification portaled into header
  // Only one NotificationPopover instance exists — it's portaled into the desktop
  // header on desktop, or rendered inline in MobileLayout on mobile.
  if (!isMobile) {
    return (
      <>
        {desktopLayout}
        {portalTarget && createPortal(notificationSlot, portalTarget)}
      </>
    )
  }

  // Mobile: render mobile-specific layout with tab bar, header, etc.
  return (
    <MobileLayout
      role={role}
      notificationSlot={notificationSlot}
      avatarSlot={
        <MobileAvatarMenu
          name={profileName}
          email={profileEmail}
          role={role}
        />
      }
      commandPaletteSlot={
        <CommandPalette
          role={role}
          externalOpen={searchOpen}
          onExternalOpenChange={setSearchOpen}
        />
      }
      onSearchOpen={() => setSearchOpen(true)}
      inquiryCount={inquiryCount}
      conversationCount={conversationCount}
    >
      {children}
    </MobileLayout>
  )
}

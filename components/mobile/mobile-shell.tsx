'use client'

import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { CommandPalette } from '@/components/command-palette'
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

  // Desktop: render the full desktop layout
  if (!isMobile) {
    return <>{desktopLayout}</>
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

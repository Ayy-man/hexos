'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  FolderKanban,
  Grid3x3,
  LayoutDashboard,
  MessageSquare,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface MobileTabBarProps {
  onMorePress: () => void
  isMoreActive: boolean
  inquiryCount?: number
  conversationCount?: number
}

interface TabDef {
  label: string
  icon: LucideIcon
  route: string
}

const tabs: TabDef[] = [
  { label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
  { label: 'Inquiries', icon: FileText, route: '/inquiries' },
  { label: 'Projects', icon: FolderKanban, route: '/projects' },
  { label: 'Conversations', icon: MessageSquare, route: '/conversations' },
]

function Badge({ count }: { count: number }) {
  if (count <= 0) return null

  return (
    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-medium px-1 leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function MobileTabBar({
  onMorePress,
  isMoreActive,
  inquiryCount,
  conversationCount,
}: MobileTabBarProps) {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  if (!isMobile) return null

  function getBadgeCount(route: string): number | undefined {
    if (route === '/inquiries') return inquiryCount
    if (route === '/conversations') return conversationCount
    return undefined
  }

  return (
    <nav
      role="tablist"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-bg-surface border-t border-border-hairline',
        'pb-[env(safe-area-inset-bottom)]'
      )}
    >
      <div className="flex h-14 items-stretch">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.route)
          const badge = getBadgeCount(tab.route)

          return (
            <Link
              key={tab.route}
              href={tab.route}
              role="tab"
              aria-selected={isActive}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <span className="relative">
                <tab.icon size={20} />
                {badge != null && badge > 0 && <Badge count={badge} />}
              </span>
              <span className="text-[10px] leading-tight">{tab.label}</span>
            </Link>
          )
        })}

        {/* More tab — button instead of link */}
        <button
          type="button"
          role="tab"
          aria-selected={isMoreActive}
          onClick={onMorePress}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5',
            isMoreActive ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Grid3x3 size={20} />
          <span className="text-[10px] leading-tight">More</span>
        </button>
      </div>
    </nav>
  )
}

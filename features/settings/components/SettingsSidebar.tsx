'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/auth/types'
import {
  User,
  Bell,
  Lock,
  Palette,
  Code2,
  Building2,
  Users,
} from 'lucide-react'

interface SettingsSidebarProps {
  userRole: UserRole
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

const generalSettings: NavItem[] = [
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: User,
    description: 'Your personal information',
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'How you receive updates',
  },
  {
    title: 'Account',
    href: '/settings/account',
    icon: Lock,
    description: 'Security and authentication',
  },
  {
    title: 'Appearance',
    href: '/settings/appearance',
    icon: Palette,
    description: 'Theme and display options',
  },
]

const roleSettings: Record<string, NavItem[]> = {
  dev: [
    {
      title: 'Developer',
      href: '/settings/developer',
      icon: Code2,
      description: 'Skills and availability',
    },
  ],
  dfy: [
    {
      title: 'Partner',
      href: '/settings/partner',
      icon: Building2,
      description: 'Company and branding',
    },
  ],
  admin: [
    {
      title: 'Team',
      href: '/admin/team',
      icon: Users,
      description: 'Manage users',
    },
  ],
  internal: [
    {
      title: 'Team',
      href: '/admin/team',
      icon: Users,
      description: 'Manage users',
    },
  ],
}

export function SettingsSidebar({ userRole }: SettingsSidebarProps) {
  const pathname = usePathname()
  const roleSpecificSettings = roleSettings[userRole] || []

  return (
    <nav className="w-56 shrink-0">
      <div className="sticky top-20 space-y-6">
        {/* General Settings */}
        <div>
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            General
          </h3>
          <div className="space-y-1">
            {generalSettings.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Role-Specific Settings */}
        {roleSpecificSettings.length > 0 && (
          <div>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {userRole === 'dev' ? 'Developer' : userRole === 'dfy' ? 'Partner' : 'Admin'}
            </h3>
            <div className="space-y-1">
              {roleSpecificSettings.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

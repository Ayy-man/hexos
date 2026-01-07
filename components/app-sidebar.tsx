'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Hexagon,
  LayoutDashboard,
  FolderKanban,
  FileText,
  Layers,
  Users,
  Settings,
  Send,
  Briefcase,
  Lightbulb,
  BookOpen,
  MessageSquare,
  Clock,
  AlertTriangle,
  Zap,
  BarChart3,
  Code,
  Flame,
  type LucideIcon,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { NavUser } from '@/components/nav-user'
import { SuggestionBox } from '@/components/suggestion-box'
import { TeamPresence } from '@/components/team-presence'
import { Badge } from '@/components/ui/badge'
import type { Profile } from '@/lib/auth/types'
import type { NavGroup } from '@/lib/navigation'

// Icon map to resolve string names to components
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Layers,
  Users,
  Settings,
  Send,
  Briefcase,
  Lightbulb,
  BookOpen,
  MessageSquare,
  Clock,
  AlertTriangle,
  Zap,
  BarChart3,
  Code,
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  profile: Profile
  navigation: NavGroup[]
  pulseStreak?: number
}

export function AppSidebar({
  profile,
  navigation,
  pulseStreak,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Hexagon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">hexOS</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {profile.role}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
                  const Icon = iconMap[item.icon] || LayoutDashboard

                  // Show streak badge for Pulse
                  const showStreakBadge = item.title === 'Pulse' && pulseStreak !== undefined && pulseStreak > 0

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        id={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Link href={item.url} prefetch={true}>
                          <Icon />
                          <span>{item.title}</span>
                          {showStreakBadge && (
                            <span className="ml-auto flex items-center gap-0.5 text-xs font-bold text-orange-500">
                              {pulseStreak}
                              <Flame className="h-3 w-3" />
                            </span>
                          )}
                          {item.badge && !showStreakBadge && (
                            <Badge variant="secondary" className="ml-auto">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SuggestionBox />
        <SidebarSeparator />
        {['admin', 'internal'].includes(profile.role) && <TeamPresence />}
        <NavUser profile={profile} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

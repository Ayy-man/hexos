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
  Wallet,
  Shield,
  Building2,
  DollarSign,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  Wallet,
  Shield,
  Building2,
  DollarSign,
}

function InquiryTooltipContent({ counts }: { counts: { unopened: number; working: number; ready: number; total: number } }) {
  return (
    <div className="space-y-1.5 text-xs">
      <p className="font-medium text-sm">Inquiry Pipeline</p>
      <div className="flex justify-between gap-4">
        <span className="text-red-500">Unopened:</span>
        <span className="tabular-nums">{counts.unopened}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-cyan-500">Working:</span>
        <span className="tabular-nums">{counts.working}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-green-500">Ready:</span>
        <span className="tabular-nums">{counts.ready}</span>
      </div>
      <div className="border-t pt-1.5 mt-1.5 flex justify-between gap-4">
        <span className="text-muted-foreground">Total Active:</span>
        <span className="tabular-nums font-medium">{counts.total}</span>
      </div>
    </div>
  )
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  profile: Profile
  navigation: NavGroup[]
  inquiryCounts?: {
    unopened: number
    working: number
    ready: number
    total: number
  }
}

export function AppSidebar({
  profile,
  navigation,
  inquiryCounts,
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
                  const isInquiriesWithCounts = item.title === 'Inquiries' && inquiryCounts

                  if (isInquiriesWithCounts) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              id={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <Link href={item.url} prefetch={true}>
                                <Icon />
                                <span>{item.title}</span>
                                {inquiryCounts.unopened > 0 && (
                                  <Badge variant="destructive" className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                    {inquiryCounts.unopened}
                                  </Badge>
                                )}
                              </Link>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" className="p-3">
                            <InquiryTooltipContent counts={inquiryCounts} />
                          </TooltipContent>
                        </Tooltip>
                      </SidebarMenuItem>
                    )
                  }

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
                          {item.badge && (
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

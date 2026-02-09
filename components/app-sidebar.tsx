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
  Video,
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
import type { UnreadConversationSummary } from '@/lib/api/conversations'

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
  Video,
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

function ProjectTooltipContent({ stats }: { stats: { total: number; active: number; inquiry: number; completed: number } }) {
  return (
    <div className="space-y-1.5 text-xs">
      <p className="font-medium text-sm">Projects</p>
      <div className="flex justify-between gap-4">
        <span className="text-cyan-500">Active:</span>
        <span className="tabular-nums">{stats.active}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-amber-500">Inquiry:</span>
        <span className="tabular-nums">{stats.inquiry}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-green-500">Completed:</span>
        <span className="tabular-nums">{stats.completed}</span>
      </div>
      <div className="border-t pt-1.5 mt-1.5 flex justify-between gap-4">
        <span className="text-muted-foreground">Total:</span>
        <span className="tabular-nums font-medium">{stats.total}</span>
      </div>
    </div>
  )
}

const CONVERSATION_TYPE_ICONS: Record<string, string> = {
  project: '📁',
  direct: '💬',
  inquiry: '📋',
  suggestion: '💡',
  workspace: '🏢',
  partner: '🤝',
}

function ConversationTooltipContent({ summary }: { summary: { total_unread: number; conversations: UnreadConversationSummary[] } }) {
  if (summary.total_unread === 0) {
    return (
      <div className="space-y-1.5 text-xs">
        <p className="font-medium text-sm">Conversations</p>
        <p className="text-muted-foreground">All caught up</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">Unread Messages</p>
        <span className="tabular-nums text-red-500 font-medium">{summary.total_unread}</span>
      </div>
      <div className="space-y-1.5">
        {summary.conversations.map((conv) => (
          <div key={conv.id} className="flex items-center gap-2">
            <span className="shrink-0">{CONVERSATION_TYPE_ICONS[conv.type] || '💬'}</span>
            <span className="truncate max-w-[140px]">{conv.title}</span>
            <span className="ml-auto tabular-nums text-red-500 font-medium">{conv.unread_count}</span>
          </div>
        ))}
      </div>
      {summary.conversations.length < summary.total_unread && (
        <p className="text-muted-foreground border-t pt-1.5">
          + more unread conversations
        </p>
      )}
    </div>
  )
}

function SuggestionTooltipContent({ counts }: { counts: Record<string, number> }) {
  const open = (counts.new || 0) + (counts.reviewed || 0)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <div className="space-y-1.5 text-xs">
      <p className="font-medium text-sm">Suggestions</p>
      <div className="flex justify-between gap-4">
        <span className="text-amber-500">New:</span>
        <span className="tabular-nums">{counts.new || 0}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-cyan-500">Reviewed:</span>
        <span className="tabular-nums">{counts.reviewed || 0}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-green-500">Implemented:</span>
        <span className="tabular-nums">{counts.implemented || 0}</span>
      </div>
      <div className="border-t pt-1.5 mt-1.5 flex justify-between gap-4">
        <span className="text-muted-foreground">Open:</span>
        <span className="tabular-nums font-medium">{open}</span>
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
  projectStats?: {
    total: number
    active: number
    inquiry: number
    completed: number
  }
  conversationSummary?: {
    total_unread: number
    conversations: UnreadConversationSummary[]
  }
  suggestionCounts?: Record<string, number>
}

export function AppSidebar({
  profile,
  navigation,
  inquiryCounts,
  projectStats,
  conversationSummary,
  suggestionCounts,
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

                  // Determine tooltip content and badge for items with stats
                  let tooltipContent: React.ReactNode = null
                  let badgeContent: React.ReactNode = null

                  if (item.title === 'Inquiries' && inquiryCounts) {
                    tooltipContent = <InquiryTooltipContent counts={inquiryCounts} />
                    if (inquiryCounts.unopened > 0) {
                      badgeContent = (
                        <Badge variant="destructive" className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                          {inquiryCounts.unopened}
                        </Badge>
                      )
                    }
                  } else if (item.title === 'Projects' && projectStats) {
                    tooltipContent = <ProjectTooltipContent stats={projectStats} />
                  } else if (item.title === 'Conversations' && conversationSummary) {
                    tooltipContent = <ConversationTooltipContent summary={conversationSummary} />
                    if (conversationSummary.total_unread > 0) {
                      badgeContent = (
                        <Badge variant="destructive" className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                          {conversationSummary.total_unread}
                        </Badge>
                      )
                    }
                  } else if (item.title === 'Suggestions' && suggestionCounts) {
                    tooltipContent = <SuggestionTooltipContent counts={suggestionCounts} />
                    const newCount = suggestionCounts.new || 0
                    if (newCount > 0) {
                      badgeContent = (
                        <Badge variant="secondary" className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                          {newCount}
                        </Badge>
                      )
                    }
                  }

                  if (tooltipContent) {
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
                                {badgeContent}
                              </Link>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" className="p-3 bg-popover text-popover-foreground border shadow-md">
                            {tooltipContent}
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
        <SuggestionBox userRole={profile.role} />
        <SidebarSeparator />
        {['admin', 'internal'].includes(profile.role) && <TeamPresence />}
        <NavUser profile={profile} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

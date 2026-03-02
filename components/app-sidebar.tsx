'use client'

import { useState } from 'react'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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

// PinnableHoverCard: replaces Tooltip with interactive Popover that opens on hover and pins on click
function PinnableHoverCard({
  children,
  content,
  side = 'right',
  align = 'start',
}: {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'right' | 'left' | 'top' | 'bottom'
  align?: 'start' | 'center' | 'end'
}) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (!pinned) setOpen(true)
  }

  const handleMouseLeave = () => {
    if (!pinned) {
      timeoutRef.current = setTimeout(() => setOpen(false), 150)
    }
  }

  const handlePin = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (pinned) {
      setPinned(false)
      setOpen(false)
    } else {
      setPinned(true)
      setOpen(true)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPinned(false)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        <PopoverTrigger asChild>
          <button
            aria-label="Pin preview"
            className="absolute inset-0 w-full opacity-0 cursor-default"
            onClick={handlePin}
            tabIndex={-1}
          />
        </PopoverTrigger>
      </div>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-72 p-3 bg-bg-elevated text-text-primary border border-border-rule shadow-[var(--shadow-float)]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}

// DrillDownRow: a stat row that lazily fetches item names on first hover and caches them
function DrillDownRow({
  label,
  count,
  colorClass,
  type,
  status,
}: {
  label: string
  count: number
  colorClass: string
  type: string
  status: string
}) {
  const [items, setItems] = useState<Array<{ id: string; name: string; href: string }> | null>(null)
  const [hovered, setHovered] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleMouseEnter = async () => {
    setHovered(true)
    if (items === null && count > 0) {
      setLoading(true)
      try {
        const res = await fetch(`/api/sidebar-previews?type=${type}&status=${status}&limit=5`)
        const data = await res.json()
        setItems(data.items || [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex justify-between gap-4">
        <span className={colorClass}>{label}:</span>
        <span className="tabular-nums">{count}</span>
      </div>
      {hovered && count > 0 && (
        <div className="mt-1 ml-2 space-y-0.5 border-l border-border-hairline pl-2">
          {loading && <span className="text-text-tertiary text-[11px]">Loading...</span>}
          {items && items.length === 0 && <span className="text-text-tertiary text-[11px]">No items</span>}
          {items && items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block text-[11px] text-text-secondary hover:text-accent hover:underline truncate"
            >
              {item.name}
            </Link>
          ))}
          {items && items.length >= 5 && (
            <span className="text-[11px] text-text-tertiary">+ more</span>
          )}
        </div>
      )}
    </div>
  )
}

function InquiryTooltipContent({ counts }: { counts: { unopened: number; working: number; ready: number; total: number } }) {
  return (
    <div className="space-y-1.5 text-xs">
      <p className="font-medium text-sm">Inquiry Pipeline</p>
      <DrillDownRow label="Unopened" count={counts.unopened} colorClass="text-signal-bad" type="inquiries" status="unopened" />
      <DrillDownRow label="Working" count={counts.working} colorClass="text-accent" type="inquiries" status="working" />
      <DrillDownRow label="Ready" count={counts.ready} colorClass="text-signal-good" type="inquiries" status="ready" />
      <div className="border-t pt-1.5 mt-1.5 flex justify-between gap-4">
        <span className="text-text-tertiary">Total Active:</span>
        <span className="tabular-nums font-medium">{counts.total}</span>
      </div>
    </div>
  )
}

function ProjectTooltipContent({ stats }: { stats: { total: number; active: number; inquiry: number; completed: number } }) {
  return (
    <div className="space-y-1.5 text-xs">
      <p className="font-medium text-sm">Projects</p>
      <DrillDownRow label="Active" count={stats.active} colorClass="text-accent" type="projects" status="active" />
      <DrillDownRow label="Inquiry" count={stats.inquiry} colorClass="text-signal-warn" type="projects" status="inquiry" />
      <DrillDownRow label="Completed" count={stats.completed} colorClass="text-signal-good" type="projects" status="completed" />
      <div className="border-t pt-1.5 mt-1.5 flex justify-between gap-4">
        <span className="text-text-tertiary">Total:</span>
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
        <p className="text-text-tertiary">All caught up</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">Unread Messages</p>
        <span className="tabular-nums text-signal-bad font-medium">{summary.total_unread}</span>
      </div>
      <div className="space-y-1.5">
        {summary.conversations.map((conv) => (
          <Link key={conv.id} href={`/conversations/${conv.id}`} className="flex items-center gap-2 hover:text-accent group">
            <span className="shrink-0">{CONVERSATION_TYPE_ICONS[conv.type] || '💬'}</span>
            <span className="truncate max-w-[140px] group-hover:underline">{conv.title}</span>
            <span className="ml-auto tabular-nums text-signal-bad font-medium">{conv.unread_count}</span>
          </Link>
        ))}
      </div>
      {summary.conversations.length < summary.total_unread && (
        <p className="text-text-tertiary border-t pt-1.5">
          + more unread conversations
        </p>
      )}
    </div>
  )
}

function SuggestionTooltipContent({ counts }: { counts: Record<string, number> }) {
  const open = (counts.new || 0) + (counts.reviewed || 0)
  return (
    <div className="space-y-1.5 text-xs">
      <p className="font-medium text-sm">Suggestions</p>
      <DrillDownRow label="New" count={counts.new || 0} colorClass="text-signal-warn" type="suggestions" status="new" />
      <DrillDownRow label="Reviewed" count={counts.reviewed || 0} colorClass="text-accent" type="suggestions" status="reviewed" />
      <DrillDownRow label="Implemented" count={counts.implemented || 0} colorClass="text-signal-good" type="suggestions" status="implemented" />
      <div className="border-t pt-1.5 mt-1.5 flex justify-between gap-4">
        <span className="text-text-tertiary">Open:</span>
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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-accent text-text-primary">
                  <Hexagon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">hexOS</span>
                  <span className="truncate text-xs font-mono uppercase tracking-wider text-text-tertiary">
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
                        <Badge variant="default" className="ml-auto h-4 w-4 rounded-full p-0 flex items-center justify-center text-[9px] font-mono font-semibold">
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
                        <Badge variant="default" className="ml-auto h-4 w-4 rounded-full p-0 flex items-center justify-center text-[9px] font-mono font-semibold">
                          {conversationSummary.total_unread}
                        </Badge>
                      )
                    }
                  } else if (item.title === 'Suggestions' && suggestionCounts) {
                    tooltipContent = <SuggestionTooltipContent counts={suggestionCounts} />
                    const newCount = suggestionCounts.new || 0
                    if (newCount > 0) {
                      badgeContent = (
                        <Badge variant="secondary" className="ml-auto h-4 w-4 rounded-full p-0 flex items-center justify-center text-[9px] font-mono font-semibold">
                          {newCount}
                        </Badge>
                      )
                    }
                  }

                  if (tooltipContent) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <PinnableHoverCard content={tooltipContent}>
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
                        </PinnableHoverCard>
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

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import {
  Search,
  FolderKanban,
  FileText,
  Layers,
  BookOpen,
  MessageSquare,
  ArrowRight,
  Clock,
  Loader2,
  Zap,
  DollarSign,
  BarChart3,
  Wallet,
  Briefcase,
  Lightbulb,
  AlertTriangle,
  Users,
  Settings,
  Code,
  LayoutDashboard,
  Target,
  Shield,
  Building2,
  Send,
  ClipboardList,
} from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { useIsMobile } from '@/hooks/use-mobile'
import { useModifierKey } from '@/hooks/use-platform'
import { globalSearch, type SearchResult, type SearchResults } from '@/lib/search'
import type { UserRole } from '@/lib/auth/types'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'

const STORAGE_KEY = 'hexos_recent_searches'
const MAX_RECENT = 5

// Quick actions based on role (defined locally since it's a pure function)
function getQuickActions(role: UserRole): SearchResult[] {
  const actions: SearchResult[] = []

  // Shared Core Navigation
  actions.push(
    {
      id: 'nav-dashboard',
      type: 'action',
      title: 'Dashboard',
      subtitle: 'Go to your personalized overview',
      link: role === 'dev' ? '/dashboard/dev' : role === 'admin' ? '/dashboard/admin' : role === 'client' ? '/dashboard/client' : '/dashboard',
    },
    {
      id: 'nav-pulse',
      type: 'pulse',
      title: 'Pulse',
      subtitle: 'Coming soon',
      link: '/pulse',
    },
    {
      id: 'nav-projects',
      type: 'project',
      title: 'Projects',
      subtitle: 'Manage all active projects',
      link: '/projects',
    },
    {
      id: 'nav-conversations',
      type: 'conversation',
      title: 'Conversations',
      subtitle: 'Communication and messages',
      link: '/conversations',
    }
  )

  // Admin / Internal / DFY
  if (['admin', 'internal', 'dfy'].includes(role)) {
    actions.push(
      {
        id: 'nav-inquiries',
        type: 'inquiry',
        title: 'Inquiries',
        subtitle: 'Deal submissions and pipeline',
        link: '/inquiries',
      },
      {
        id: 'nav-blueprints',
        type: 'blueprint',
        title: 'Blueprints',
        subtitle: 'Automation solutions',
        link: '/blueprints',
      },
      {
        id: 'nav-case-studies',
        type: 'case-study',
        title: 'Case Studies',
        subtitle: 'Portfolio of work',
        link: '/case-studies',
      },
      {
        id: 'nav-suggestions',
        type: 'suggestion',
        title: 'Suggestions',
        subtitle: 'User and internal feedback',
        link: '/suggestions',
      }
    )
  }

  // Admin / Internal Management
  if (['admin', 'internal'].includes(role)) {
    actions.push(
      {
        id: 'nav-metrics',
        type: 'metric',
        title: 'Metrics',
        subtitle: 'Operational and financial stats',
        link: '/dashboard/admin/metrics',
      },
      {
        id: 'nav-finances',
        type: 'finance',
        title: 'Finances',
        subtitle: 'Revenue, costs, and budgets',
        link: '/finances',
      },
      {
        id: 'nav-blockers',
        type: 'blocker',
        title: 'Blockers',
        subtitle: 'Identify project bottlenecks',
        link: '/admin/blockers',
      },
      {
        id: 'nav-time-reports',
        type: 'report',
        title: 'Time Reports',
        subtitle: 'Tracked time and effort',
        link: '/admin/time-reports',
      },
      {
        id: 'nav-admin-devs',
        type: 'team',
        title: 'Developers',
        subtitle: 'Manage developer network',
        link: '/admin/devs',
      },
      {
        id: 'nav-admin-ops',
        type: 'opportunity',
        title: 'Opportunities',
        subtitle: 'Manage biddable tasks',
        link: '/admin/opportunities',
      }
    )
  }

  // Admin Specific (Teams)
  if (role === 'admin') {
    actions.push(
      {
        id: 'nav-admin-team',
        type: 'profile',
        title: 'Hexona Team',
        subtitle: 'Internal staff management',
        link: '/admin/team',
      },
      {
        id: 'nav-admin-partners',
        type: 'partner',
        title: 'DFY Partners',
        subtitle: 'Manage agency partners',
        link: '/admin/partners',
      },
      {
        id: 'nav-admin-apps',
        type: 'application',
        title: 'Applications',
        subtitle: 'Developer and partner signups',
        link: '/admin/applications',
      },
      {
        id: 'nav-admin-settings-team',
        type: 'team',
        title: 'Team Settings',
        subtitle: 'Manage organization members',
        link: '/settings/team',
      }
    )
  }

  // DFY Specific
  if (role === 'dfy') {
    actions.push(
      {
        id: 'nav-dfy-submit',
        type: 'inquiry',
        title: 'Submit Inquiry',
        subtitle: 'Submit a new deal lead',
        link: '/inquiries/new',
      },
      {
        id: 'nav-dfy-settings-team',
        type: 'team',
        title: 'Team Settings',
        subtitle: 'Manage your organization',
        link: '/dashboard/dfy/settings/team',
      }
    )
  }

  // Developer Specific
  if (role === 'dev') {
    actions.push(
      {
        id: 'nav-dev-payouts',
        type: 'payout',
        title: 'Payouts',
        subtitle: 'Earnings and payments',
        link: '/dashboard/dev/payouts',
      },
      {
        id: 'nav-dev-ops',
        type: 'opportunity',
        title: 'Opportunities',
        subtitle: 'Available projects for bidding',
        link: '/opportunities',
      },
      {
        id: 'nav-dev-profile',
        type: 'profile',
        title: 'My Profile',
        subtitle: 'Public developer profile',
        link: '/settings/developer',
      },
      {
        id: 'nav-dev-settings-team',
        type: 'team',
        title: 'Team Settings',
        subtitle: 'Manage your organization',
        link: '/dashboard/dev/settings/team',
      }
    )
  }

  // Unified Settings
  actions.push({
    id: 'nav-settings',
    type: 'settings',
    title: 'Settings',
    subtitle: 'Account and interface preferences',
    link: '/settings',
  })

  return actions
}

// Icon mapping for result types
const typeIcons: Record<SearchResult['type'], React.ReactNode> = {
  project: <FolderKanban className="h-4 w-4 text-cyan-500" />,
  inquiry: <FileText className="h-4 w-4 text-blue-500" />,
  blueprint: <Layers className="h-4 w-4 text-purple-500" />,
  'case-study': <BookOpen className="h-4 w-4 text-green-500" />,
  conversation: <MessageSquare className="h-4 w-4 text-orange-500" />,
  action: <ArrowRight className="h-4 w-4 text-muted-foreground" />,
  pulse: <Zap className="h-4 w-4 text-yellow-500" />,
  finance: <DollarSign className="h-4 w-4 text-emerald-500" />,
  metric: <BarChart3 className="h-4 w-4 text-indigo-500" />,
  payout: <Wallet className="h-4 w-4 text-cyan-500" />,
  opportunity: <Briefcase className="h-4 w-4 text-amber-500" />,
  suggestion: <Lightbulb className="h-4 w-4 text-yellow-400" />,
  blocker: <AlertTriangle className="h-4 w-4 text-red-500" />,
  team: <Users className="h-4 w-4 text-blue-400" />,
  settings: <Settings className="h-4 w-4 text-slate-500" />,
  profile: <Code className="h-4 w-4 text-pink-500" />,
  partner: <Building2 className="h-4 w-4 text-amber-600" />,
  application: <ClipboardList className="h-4 w-4 text-blue-600" />,
  report: <Clock className="h-4 w-4 text-indigo-400" />,
}

interface CommandPaletteProps {
  role: UserRole
}

export function CommandPalette({ role }: CommandPaletteProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const modifierKey = useModifierKey()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([])

  const debouncedQuery = useDebounce(query, 300)

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Global keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Search when debounced query changes
  useEffect(() => {
    let cancelled = false

    if (!debouncedQuery.trim()) {
      setResults(null)
      setLoading(false)
      return
    }

    setLoading(true)

    globalSearch(debouncedQuery, role).then((searchResults) => {
      if (!cancelled) {
        setResults(searchResults)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, role])

  // Clear query and reset state when closing
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults(null)
    }
  }, [open])

  // Handle result selection
  const handleSelect = useCallback(
    async (result: SearchResult) => {
      // Save to recent searches (only for non-action results)
      if (result.type !== 'action' && result.id !== 'nav-dashboard') {
        const updated = [
          result,
          ...recentSearches.filter((r) => r.id !== result.id || r.type !== result.type),
        ].slice(0, MAX_RECENT)

        setRecentSearches(updated)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch {
          // Ignore storage errors
        }
      }

      setOpen(false)
      router.push(result.link)
    },
    [recentSearches, router, open]
  )

  // Clear recent searches
  const clearRecent = useCallback(() => {
    setRecentSearches([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const quickActions = getQuickActions(role)

  // Check if there are any results
  const hasResults =
    results &&
    (results.projects.length > 0 ||
      results.inquiries.length > 0 ||
      results.blueprints.length > 0 ||
      results.caseStudies.length > 0 ||
      results.conversations.length > 0)

  // Result item component
  const ResultItem = ({ result }: { result: SearchResult }) => (
    <CommandItem
      key={`${result.type}-${result.id}`}
      value={`${result.title} ${result.subtitle} ${result.type}`}
      onSelect={() => handleSelect(result)}
      className="relative flex items-center gap-3 py-3 px-4 outline-none 
                 data-[selected=true]:bg-cyan-500/10 data-[selected=true]:text-cyan-500
                 hover:bg-cyan-500/5 transition-all duration-200 rounded-lg mx-1 group"
    >
      <span className="shrink-0">{typeIcons[result.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate text-foreground/90">{result.title}</div>
        <div className="text-xs text-muted-foreground truncate group-data-[selected=true]:text-cyan-500/70">{result.subtitle}</div>
      </div>
    </CommandItem>
  )

  // Shared command content
  const commandContent = (
    <Command className="bg-transparent overflow-hidden" shouldFilter={true}>
      <div className="flex items-center border-b px-3 bg-background/20 backdrop-blur-md">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandInput
          placeholder="Search everything..."
          value={query}
          onValueChange={setQuery}
          className="h-14 border-none bg-transparent focus:ring-0 text-md"
        />
      </div>
      <CommandList className="max-h-[450px] overflow-y-auto p-2 scrollbar-hide">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500/50" />
          </div>
        )}

        <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
          {!loading && `No results found for "${query}"`}
        </CommandEmpty>

        <AnimatePresence mode="popLayout">
          {/* Static Navigation - Always searchable */}
          {(
            <CommandGroup heading={query ? "Navigation" : "Quick Links"}>
              {quickActions.map((action) => (
                <ResultItem key={`nav-${action.id}`} result={action} />
              ))}
            </CommandGroup>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <CommandGroup heading="Recent">
              {recentSearches.map((result) => (
                <ResultItem key={`recent-${result.type}-${result.id}`} result={result} />
              ))}
              <div
                onClick={clearRecent}
                className="flex items-center justify-center gap-1.5 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Clock className="h-3 w-3" />
                Clear history
              </div>
            </CommandGroup>
          )}

          {/* Dynamic Search Results */}
          {results && query && (
            <>
              {results.projects.length > 0 && (
                <CommandGroup heading="Projects">
                  {results.projects.map((result) => (
                    <ResultItem key={`project-${result.id}`} result={result} />
                  ))}
                </CommandGroup>
              )}

              {results.inquiries.length > 0 && (
                <CommandGroup heading="Inquiries">
                  {results.inquiries.map((result) => (
                    <ResultItem key={`inquiry-${result.id}`} result={result} />
                  ))}
                </CommandGroup>
              )}

              {results.blueprints.length > 0 && (
                <CommandGroup heading="Blueprints">
                  {results.blueprints.map((result) => (
                    <ResultItem key={`blueprint-${result.id}`} result={result} />
                  ))}
                </CommandGroup>
              )}

              {results.caseStudies.length > 0 && (
                <CommandGroup heading="Case Studies" className="border-t border-white/5 pt-2 mt-2">
                  {results.caseStudies.map((result) => (
                    <ResultItem key={`case-study-${result.id}`} result={result} />
                  ))}
                </CommandGroup>
              )}

              {results.conversations.length > 0 && (
                <CommandGroup heading="Conversations" className="border-t border-white/5 pt-2 mt-2">
                  {results.conversations.map((result) => (
                    <ResultItem key={`conversation-${result.id}`} result={result} />
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </AnimatePresence>
      </CommandList>

      {/* Footer with keyboard hints */}
      <div className="flex items-center justify-between border-t border-white/5 bg-background/40 backdrop-blur-md px-4 py-3 text-[10px] font-medium text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <kbd className="flex h-5 items-center justify-center rounded border border-white/10 bg-muted/50 px-1.5 font-sans text-[11px]">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="flex h-5 items-center justify-center rounded border border-white/10 bg-muted/50 px-1.5 font-sans text-[11px]">↑↓</kbd>
            Navigate
          </span>
        </div>
        <span className="flex items-center gap-1.5">
          <kbd className="flex h-5 items-center justify-center rounded border border-white/10 bg-muted/50 px-1.5 font-sans text-[11px]">esc</kbd>
          Dismiss
        </span>
      </div>
    </Command>
  )

  // Mobile: Full-screen sheet
  if (isMobile) {
    return (
      <>
        <CommandPaletteTrigger onClick={() => setOpen(true)} modifierKey={modifierKey} isMobile />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="top" className="h-[100dvh] p-0 border-none bg-background/95 backdrop-blur-2xl">
            <VisuallyHidden>
              <SheetTitle>Search</SheetTitle>
              <SheetDescription>
                Search for projects, inquiries, blueprints, and more
              </SheetDescription>
            </VisuallyHidden>
            {commandContent}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Desktop: Floating dialog
  return (
    <>
      <CommandPaletteTrigger onClick={() => setOpen(true)} modifierKey={modifierKey} />
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="max-w-[650px] border-none bg-background/60 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-white/10"
      >
        {commandContent}
      </CommandDialog>
    </>
  )
}

// Trigger button component
interface TriggerProps {
  onClick: () => void
  modifierKey: string
  isMobile?: boolean
}

function CommandPaletteTrigger({ onClick, modifierKey, isMobile }: TriggerProps) {
  if (isMobile) {
    return (
      <Button variant="ghost" size="icon" onClick={onClick} aria-label="Search">
        <Search className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
    >
      <Search className="mr-2 h-4 w-4" />
      <span className="hidden lg:inline-flex">Search...</span>
      <span className="inline-flex lg:hidden">Search</span>
      <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">{modifierKey}</span>K
      </kbd>
    </Button>
  )
}

// Export the trigger separately for flexible placement
export { CommandPaletteTrigger }

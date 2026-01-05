'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Sheet, SheetContent } from '@/components/ui/sheet'
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
} from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { useIsMobile } from '@/hooks/use-mobile'
import { useModifierKey } from '@/hooks/use-platform'
import { globalSearch, type SearchResult, type SearchResults } from '@/lib/search'
import type { UserRole } from '@/lib/auth/types'

const STORAGE_KEY = 'hexos_recent_searches'
const MAX_RECENT = 5

// Quick actions based on role (defined locally since it's a pure function)
function getQuickActions(role: UserRole): SearchResult[] {
  const actions: SearchResult[] = [
    {
      id: 'nav-projects',
      type: 'action',
      title: 'Go to Projects',
      subtitle: 'View all projects',
      link: '/projects',
    },
    {
      id: 'nav-conversations',
      type: 'action',
      title: 'Go to Conversations',
      subtitle: 'View all messages',
      link: '/conversations',
    },
  ]

  // Admin/Internal/DFY actions
  if (['admin', 'internal', 'dfy'].includes(role)) {
    actions.push(
      {
        id: 'nav-inquiries',
        type: 'action',
        title: 'Go to Inquiries',
        subtitle: 'View all submissions',
        link: '/inquiries',
      },
      {
        id: 'new-inquiry',
        type: 'action',
        title: 'New Inquiry',
        subtitle: 'Submit a new deal',
        link: '/inquiries/new',
      }
    )
  }

  // Blueprints/Case Studies
  if (['admin', 'internal', 'dfy'].includes(role)) {
    actions.push(
      {
        id: 'nav-blueprints',
        type: 'action',
        title: 'Go to Blueprints',
        subtitle: 'Browse automation solutions',
        link: '/blueprints',
      },
      {
        id: 'nav-case-studies',
        type: 'action',
        title: 'Go to Case Studies',
        subtitle: 'View success stories',
        link: '/case-studies',
      }
    )
  }

  // Admin-only actions
  if (role === 'admin') {
    actions.push({
      id: 'nav-settings',
      type: 'action',
      title: 'Go to Settings',
      subtitle: 'Manage account settings',
      link: '/settings',
    })
  }

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

  // Clear query when closing
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults(null)
    }
  }, [open])

  // Handle result selection
  const handleSelect = useCallback(
    (result: SearchResult) => {
      // Save to recent searches (only for non-action results)
      if (result.type !== 'action') {
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
    [recentSearches, router]
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
      value={`${result.type}-${result.id}-${result.title}`}
      onSelect={() => handleSelect(result)}
      className="flex items-center gap-3 py-3"
    >
      <span className="shrink-0">{typeIcons[result.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{result.title}</div>
        <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
      </div>
    </CommandItem>
  )

  // Shared command content
  const commandContent = (
    <>
      <CommandInput
        placeholder="Search projects, inquiries, blueprints..."
        value={query}
        onValueChange={setQuery}
        className="h-12"
      />
      <CommandList className="max-h-[400px]">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && query && !hasResults && (
          <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
        )}

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <CommandGroup heading="Recent">
            {recentSearches.map((result) => (
              <ResultItem key={`recent-${result.type}-${result.id}`} result={result} />
            ))}
            <CommandItem
              onSelect={clearRecent}
              className="text-xs text-muted-foreground justify-center py-2"
            >
              <Clock className="h-3 w-3 mr-1" />
              Clear recent searches
            </CommandItem>
          </CommandGroup>
        )}

        {/* Quick Actions */}
        {!query && (
          <>
            {recentSearches.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Quick Actions">
              {quickActions.map((action) => (
                <ResultItem key={action.id} result={action} />
              ))}
            </CommandGroup>
          </>
        )}

        {/* Search Results */}
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
              <CommandGroup heading="Case Studies">
                {results.caseStudies.map((result) => (
                  <ResultItem key={`case-study-${result.id}`} result={result} />
                ))}
              </CommandGroup>
            )}

            {results.conversations.length > 0 && (
              <CommandGroup heading="Conversations">
                {results.conversations.map((result) => (
                  <ResultItem key={`conversation-${result.id}`} result={result} />
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>

      {/* Footer with keyboard hints */}
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            <kbd className="rounded border bg-muted px-1">↵</kbd> select
          </span>
          <span>
            <kbd className="rounded border bg-muted px-1">↑↓</kbd> navigate
          </span>
        </div>
        <span>
          <kbd className="rounded border bg-muted px-1">esc</kbd> close
        </span>
      </div>
    </>
  )

  // Mobile: Full-screen sheet
  if (isMobile) {
    return (
      <>
        <CommandPaletteTrigger onClick={() => setOpen(true)} modifierKey={modifierKey} isMobile />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="top" className="h-[100dvh] p-0">
            <Command className="h-full flex flex-col">{commandContent}</Command>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Desktop: Floating dialog
  return (
    <>
      <CommandPaletteTrigger onClick={() => setOpen(true)} modifierKey={modifierKey} />
      <CommandDialog open={open} onOpenChange={setOpen}>
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

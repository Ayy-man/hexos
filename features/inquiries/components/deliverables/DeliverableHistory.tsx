'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Clock, User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeliverableHistoryEntry, HistoryAction } from '@/lib/api/proposal-deliverables'

interface DeliverableHistoryProps {
  deliverableId: string
  getHistory: (id: string) => Promise<DeliverableHistoryEntry[]>
}

const ACTION_CONFIG: Record<
  HistoryAction,
  { label: string; icon: 'dfy' | 'admin' | 'system'; color: string }
> = {
  created: {
    label: 'Created',
    icon: 'system',
    color: 'text-gray-500',
  },
  dfy_edited: {
    label: 'DFY edited',
    icon: 'dfy',
    color: 'text-blue-600',
  },
  dfy_removed: {
    label: 'DFY removed',
    icon: 'dfy',
    color: 'text-red-600',
  },
  dfy_added: {
    label: 'DFY added',
    icon: 'dfy',
    color: 'text-green-600',
  },
  int_approved: {
    label: 'Admin approved',
    icon: 'admin',
    color: 'text-emerald-600',
  },
  int_rejected: {
    label: 'Admin rejected',
    icon: 'admin',
    color: 'text-rose-600',
  },
  int_countered: {
    label: 'Admin countered',
    icon: 'admin',
    color: 'text-amber-600',
  },
  dfy_accepted_counter: {
    label: 'DFY accepted counter',
    icon: 'dfy',
    color: 'text-emerald-600',
  },
  dfy_rejected_counter: {
    label: 'DFY rejected counter',
    icon: 'dfy',
    color: 'text-orange-600',
  },
  reverted: {
    label: 'Reverted',
    icon: 'system',
    color: 'text-gray-500',
  },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPrice(price: number | null): string {
  if (price === null) return 'TBD'
  return `$${price.toLocaleString()}`
}

export function DeliverableHistory({
  deliverableId,
  getHistory,
}: DeliverableHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState<DeliverableHistoryEntry[]>([])
  const [isLoading, startTransition] = useTransition()
  const [hasLoaded, setHasLoaded] = useState(false)

  // Load history when opened for the first time
  useEffect(() => {
    if (isOpen && !hasLoaded) {
      startTransition(async () => {
        try {
          const data = await getHistory(deliverableId)
          setHistory(data)
          setHasLoaded(true)
        } catch (error) {
          console.error('Failed to load history:', error)
        }
      })
    }
  }, [isOpen, hasLoaded, deliverableId, getHistory])

  // Always show the button - history loads on first click
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3 mr-1" />
          ) : (
            <ChevronRight className="h-3 w-3 mr-1" />
          )}
          <Clock className="h-3 w-3 mr-1" />
          History
          {hasLoaded && history.length > 0 && (
            <span className="ml-1">({history.length})</span>
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-2">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2">
            No history yet
          </div>
        ) : (
          <div className="relative pl-4 border-l-2 border-muted space-y-3">
            {history.map((entry, index) => {
              const config = ACTION_CONFIG[entry.action]
              const isLatest = index === 0

              return (
                <div key={entry.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'absolute -left-[21px] w-3 h-3 rounded-full border-2 bg-background',
                      isLatest ? 'border-primary bg-primary' : 'border-muted-foreground'
                    )}
                  />

                  {/* Content */}
                  <div className="space-y-1">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          config.color
                        )}
                      >
                        v{entry.version}
                      </span>
                      <span className={cn('text-xs font-medium', config.color)}>
                        {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Name: {entry.name}</div>
                      {entry.price !== null && (
                        <div>Price: {formatPrice(entry.price)}</div>
                      )}
                      {/* Show counter values if this was a counter action */}
                      {entry.action === 'int_countered' && (
                        <div className="pl-2 border-l border-amber-300 mt-1">
                          {entry.counter_name && (
                            <div className="text-amber-600">
                              Counter name: {entry.counter_name}
                            </div>
                          )}
                          {entry.counter_description && (
                            <div className="text-amber-600">
                              Counter desc: {entry.counter_description}
                            </div>
                          )}
                          {entry.counter_price !== null && (
                            <div className="text-amber-600">
                              Counter price: {formatPrice(entry.counter_price)}
                            </div>
                          )}
                        </div>
                      )}
                      {entry.note && (
                        <div className="italic">
                          &ldquo;{entry.note}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

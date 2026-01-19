'use client'

import { formatDistanceToNow } from 'date-fns'
import { TrendingUp, Coffee, AlertTriangle, ChevronDown, ChevronRight, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DevCheckin } from '@/lib/api/dev-logging'
import { useState } from 'react'

interface CheckinHistoryListProps {
  checkins: DevCheckin[]
  showProjectName?: boolean
}

export function CheckinHistoryList({ checkins, showProjectName = false }: CheckinHistoryListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'progress':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'no_work':
        return <Coffee className="h-4 w-4 text-gray-600" />
      case 'delay':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />
      default:
        return null
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'progress':
        return 'Made Progress'
      case 'no_work':
        return 'No Work'
      case 'delay':
        return 'Blocked'
      default:
        return type
    }
  }

  if (checkins.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No check-ins recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {checkins.map((checkin) => {
        const isExpanded = expandedIds.has(checkin.id)
        const hasNotes = checkin.notes && checkin.notes.length > 0

        return (
          <div
            key={checkin.id}
            className="border rounded-lg overflow-hidden"
          >
            {/* Header */}
            <button
              type="button"
              onClick={() => hasNotes && toggleExpanded(checkin.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 text-left',
                hasNotes && 'hover:bg-muted/50 cursor-pointer'
              )}
              disabled={!hasNotes}
            >
              {hasNotes && (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )
              )}
              {!hasNotes && <div className="w-4" />}

              {getTypeIcon(checkin.checkin_type)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {getTypeLabel(checkin.checkin_type)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(checkin.checkin_date), { addSuffix: true })}
                  </span>
                </div>
                {checkin.summary && (
                  <p className="text-sm text-muted-foreground truncate">
                    {checkin.summary}
                  </p>
                )}
              </div>

              {hasNotes && (
                <span className="text-xs text-muted-foreground">
                  {checkin.notes?.length} update{checkin.notes?.length !== 1 ? 's' : ''}
                </span>
              )}
            </button>

            {/* Notes (expanded) */}
            {isExpanded && checkin.notes && (
              <div className="border-t bg-muted/20 p-3 space-y-2">
                {checkin.notes.map((note) => (
                  <div key={note.id} className="flex items-start gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium">
                        {note.deliverable?.title || 'Unknown deliverable'}
                      </div>
                      {note.position_delta !== null && note.position_delta !== 0 && (
                        <div className={cn(
                          'text-xs',
                          note.position_delta > 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {note.position_before}% → {note.position_after}%
                          ({note.position_delta > 0 ? '+' : ''}{note.position_delta}%)
                        </div>
                      )}
                      {note.note && (
                        <p className="text-muted-foreground">{note.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

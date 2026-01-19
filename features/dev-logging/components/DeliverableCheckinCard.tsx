'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { PositionQuickButtons } from './PositionQuickButtons'
import { ChevronDown, ChevronRight, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Deliverable } from '@/lib/api/deliverables'

interface DeliverableCheckinCardProps {
  deliverable: Deliverable
  note: string
  positionDelta: number
  onChange: (note: string, positionDelta: number) => void
}

export function DeliverableCheckinCard({
  deliverable,
  note,
  positionDelta,
  onChange,
}: DeliverableCheckinCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const currentPosition = deliverable.hill_position ?? 0
  const newPosition = Math.max(0, Math.min(100, currentPosition + positionDelta))

  const handleDeltaChange = (delta: number) => {
    onChange(note, delta)
  }

  const handleNoteChange = (newNote: string) => {
    onChange(newNote, positionDelta)
  }

  const hasChanges = note.trim() !== '' || positionDelta !== 0

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-colors',
        hasChanges && 'border-primary/50 bg-primary/5'
      )}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Package className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{deliverable.title}</div>
          <div className="text-xs text-muted-foreground">
            Position: {currentPosition}%
            {positionDelta !== 0 && (
              <span className={cn(
                'ml-2 font-medium',
                positionDelta > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                → {newPosition}% ({positionDelta > 0 ? '+' : ''}{positionDelta}%)
              </span>
            )}
          </div>
        </div>
        {hasChanges && (
          <div className="w-2 h-2 rounded-full bg-primary" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t bg-muted/20">
          {/* Quick position buttons */}
          <div className="pt-3">
            <PositionQuickButtons
              currentDelta={positionDelta}
              onDeltaChange={handleDeltaChange}
              currentPosition={currentPosition}
            />
          </div>

          {/* Note input */}
          <div>
            <Input
              placeholder="What did you do on this deliverable?"
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}

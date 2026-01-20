'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  ChevronRight,
  ImageIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Suggestion } from '@/lib/api/suggestions'
import { SuggestionDetailSheet } from './SuggestionDetailSheet'

const statusConfig = {
  new: { label: 'New', icon: Clock, className: 'bg-info-muted text-info border-info/20' },
  reviewed: { label: 'Reviewed', icon: Eye, className: 'bg-warning-muted text-warning border-warning/20' },
  implemented: { label: 'Implemented', icon: CheckCircle, className: 'bg-success-muted text-success border-success/20' },
  declined: { label: 'Declined', icon: XCircle, className: 'bg-error-muted text-error border-error/20' },
}

interface MySuggestionsListProps {
  suggestions: Suggestion[]
  currentUserId: string
}

export function MySuggestionsList({ suggestions, currentUserId }: MySuggestionsListProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion)
    setSheetOpen(true)
  }

  return (
    <>
      <div className="space-y-3">
        {suggestions.map((suggestion) => {
          const status = statusConfig[suggestion.status]
          const StatusIcon = status.icon

          return (
            <Card
              key={suggestion.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <CardHeader className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{suggestion.title}</h3>
                      <Badge variant="outline" className={status.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      {suggestion.image_url && (
                        <Badge variant="secondary" className="text-xs">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          Image
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Submitted {format(new Date(suggestion.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              {suggestion.description && (
                <CardContent className="pt-0 px-4 pb-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {suggestion.description}
                  </p>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      <SuggestionDetailSheet
        suggestion={selectedSuggestion}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        currentUserId={currentUserId}
      />
    </>
  )
}

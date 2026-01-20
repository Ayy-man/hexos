'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import {
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ChatPanel } from '@/features/conversations/components/ChatPanel'
import type { Suggestion } from '@/lib/api/suggestions'
import type { Conversation, Message } from '@/lib/api/conversations.shared'
import { getSuggestionConversationAction, getConversationMessagesAction, getConversationParticipantsAction } from '@/features/suggestions/actions/suggestionActions'

const statusConfig = {
  new: { label: 'New', icon: Clock, className: 'bg-info-muted text-info border-info/20' },
  reviewed: { label: 'Reviewed', icon: Eye, className: 'bg-warning-muted text-warning border-warning/20' },
  implemented: { label: 'Implemented', icon: CheckCircle, className: 'bg-success-muted text-success border-success/20' },
  declined: { label: 'Declined', icon: XCircle, className: 'bg-error-muted text-error border-error/20' },
}

interface SuggestionDetailSheetProps {
  suggestion: Suggestion | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId: string
}

export function SuggestionDetailSheet({
  suggestion,
  open,
  onOpenChange,
  currentUserId,
}: SuggestionDetailSheetProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [participants, setParticipants] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && suggestion) {
      loadConversationData()
    }
  }, [open, suggestion])

  const loadConversationData = async () => {
    if (!suggestion) return

    setIsLoading(true)
    try {
      const [convResult, participantsResult] = await Promise.all([
        getSuggestionConversationAction(suggestion.id),
        getConversationParticipantsAction(suggestion.id),
      ])

      if (convResult.conversation) {
        setConversation(convResult.conversation)

        const messagesResult = await getConversationMessagesAction(convResult.conversation.id)
        setMessages(messagesResult)
      }

      setParticipants(participantsResult)
    } catch (error) {
      console.error('Failed to load conversation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!suggestion) return null

  const status = statusConfig[suggestion.status]
  const StatusIcon = status.icon

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left">{suggestion.title}</SheetTitle>
          <SheetDescription className="text-left">
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={status.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              <span className="text-xs">
                Submitted {format(new Date(suggestion.created_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0 mt-4">
          {/* Suggestion Details */}
          <div className="space-y-4">
            {suggestion.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {suggestion.description}
                </p>
              </div>
            )}

            {suggestion.image_url && (
              <div>
                <h4 className="text-sm font-medium mb-2">Screenshot</h4>
                <div className="relative h-40 w-full rounded-lg border overflow-hidden">
                  <Image
                    src={suggestion.image_url}
                    alt="Suggestion screenshot"
                    fill
                    className="object-cover"
                    sizes="(max-width: 500px) 100vw, 500px"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Conversation */}
          <div className="flex-1 min-h-0 flex flex-col">
            <h4 className="text-sm font-medium mb-2">Conversation</h4>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversation ? (
              <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
                <ChatPanel
                  conversation={conversation}
                  initialMessages={messages}
                  currentUserId={currentUserId}
                  participants={participants}
                  className="h-full"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                No conversation thread available
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

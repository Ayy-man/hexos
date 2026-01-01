'use client'

import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/lib/api/conversations'
import { CONVERSATION_TYPE_LABELS } from '@/lib/api/conversations'
import { UnreadBadge } from './UnreadBadge'

interface ConversationItemProps {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
}

export function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const lastMessageTime = conversation.last_message?.created_at
    ? formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })
    : null

  const lastMessagePreview = conversation.last_message?.content
    ? truncate(conversation.last_message.content, 50)
    : 'No messages yet'

  const senderName = conversation.last_message?.sender?.name || null

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50',
        isSelected && 'bg-muted'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Project name */}
          <div className="font-medium text-sm truncate">
            {conversation.project?.project_name || 'Unknown Project'}
          </div>

          {/* Conversation type badge */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {CONVERSATION_TYPE_LABELS[conversation.type]}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {conversation.project?.client_name}
            </span>
          </div>

          {/* Last message preview */}
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {senderName && <span className="font-medium">{senderName}: </span>}
            {lastMessagePreview}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {/* Time */}
          {lastMessageTime && (
            <span className="text-xs text-muted-foreground">{lastMessageTime}</span>
          )}

          {/* Unread badge */}
          {(conversation.unread_count || 0) > 0 && (
            <UnreadBadge count={conversation.unread_count || 0} />
          )}
        </div>
      </div>
    </button>
  )
}

function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

'use client'

import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/lib/api/conversations.shared'
import { CONVERSATION_TYPE_LABELS } from '@/lib/api/conversations.shared'
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

  // Get display name based on conversation type
  const getDisplayName = () => {
    if (conversation.type === 'direct') {
      // For DMs, show participant names or title
      if (conversation.title) return conversation.title
      if (conversation.participants && conversation.participants.length > 0) {
        return conversation.participants
          .map((p) => p.user?.name || 'Unknown')
          .join(', ')
      }
      return 'Direct Message'
    }

    if (conversation.type === 'inquiry') {
      // For inquiries, show project type and client
      if (conversation.inquiry) {
        return `${conversation.inquiry.project_type} - ${conversation.inquiry.client_name}`
      }
      return 'Inquiry'
    }

    // For project conversations
    return conversation.project?.project_name || 'Unknown Project'
  }

  // Get subtitle based on conversation type
  const getSubtitle = () => {
    if (conversation.type === 'direct') {
      return 'Direct Message'
    }

    if (conversation.type === 'inquiry') {
      const status = conversation.inquiry?.status || 'unknown'
      return `Inquiry • ${status.charAt(0).toUpperCase() + status.slice(1)}`
    }

    // For project conversations
    return `${CONVERSATION_TYPE_LABELS[conversation.type]} • ${conversation.project?.client_name || ''}`
  }

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
          {/* Display name */}
          <div className="font-medium text-sm truncate">{getDisplayName()}</div>

          {/* Subtitle */}
          <div className="text-xs text-muted-foreground mt-0.5">{getSubtitle()}</div>

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

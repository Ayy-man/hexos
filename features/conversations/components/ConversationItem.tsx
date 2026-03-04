'use client'

import { memo } from 'react'
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Conversation, ConversationType } from '@/lib/api/conversations.shared'
import { CONVERSATION_TYPE_LABELS } from '@/lib/api/conversations.shared'
import { UnreadBadge, UnreadDot } from './UnreadBadge'

function formatConversationTime(date: Date): string {
  if (isToday(date)) return format(date, 'h:mm a')
  if (isYesterday(date)) return 'Yesterday'
  if (isThisWeek(date)) return format(date, 'EEEE')
  if (isThisYear(date)) return format(date, 'MMM d')
  return format(date, 'M/d/yy')
}
import { Users, Briefcase, Handshake, MessageCircle, FileQuestion, Lightbulb } from 'lucide-react'

// Type badge configuration with colors and icons
export const CONVERSATION_TYPE_CONFIG: Record<ConversationType, {
  icon: typeof Users
  color: string
  bgColor: string
}> = {
  project: {
    icon: Users,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/50',
  },
  workspace: {
    icon: Briefcase,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/50',
  },
  partner: {
    icon: Handshake,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/50',
  },
  direct: {
    icon: MessageCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
  },
  inquiry: {
    icon: FileQuestion,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/50',
  },
  suggestion: {
    icon: Lightbulb,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/50',
  },
}

interface ConversationItemProps {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
  currentUserId?: string
}

export const ConversationItem = memo(function ConversationItem({ conversation, isSelected, onClick, currentUserId }: ConversationItemProps) {
  const hasUnread = (conversation.unread_count || 0) > 0
  const hasMentions = (conversation.mention_count || 0) > 0

  const lastMessageTime = conversation.last_message?.created_at
    ? formatConversationTime(new Date(conversation.last_message.created_at))
    : null

  const lastMessagePreview = conversation.last_message?.content
    ? truncate(conversation.last_message.content, 50)
    : conversation.last_message?.attachments?.length
      ? 'Sent an attachment'
      : 'No messages yet'

  const isOwnMessage = conversation.last_message?.sender_id === currentUserId
  const senderDisplay = conversation.last_message
    ? isOwnMessage
      ? 'You'
      : (conversation.last_message.sender?.name || null)
    : null

  // For direct messages, find the OTHER person
  const otherParticipant = conversation.type === 'direct' && conversation.participants
    ? conversation.participants.find(p => p.user_id !== currentUserId)?.user
    : null

  // Get display name based on conversation type
  const getDisplayName = () => {
    if (conversation.type === 'direct') {
      if (otherParticipant?.name) return otherParticipant.name
      if (conversation.title) return conversation.title
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
      return null // Badge handles this
    }

    if (conversation.type === 'inquiry') {
      const status = conversation.inquiry?.status || 'unknown'
      return status.charAt(0).toUpperCase() + status.slice(1)
    }

    // For project conversations, just show client name
    return conversation.project?.client_name || ''
  }

  const typeConfig = CONVERSATION_TYPE_CONFIG[conversation.type]
  const TypeIcon = typeConfig.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50',
        isSelected && 'bg-muted'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar for DMs, type icon for others */}
        {conversation.type === 'direct' && otherParticipant ? (
          otherParticipant.avatar_url ? (
            <img src={otherParticipant.avatar_url} alt="" className="shrink-0 w-8 h-8 rounded-full object-cover mt-0.5" />
          ) : (
            <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-0.5 text-xs font-medium">
              {otherParticipant.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )
        ) : (
          <div className={cn(
            'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5',
            typeConfig.bgColor
          )}>
            <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Display name */}
          <div className={cn(
            "text-sm truncate",
            hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
          )}>{getDisplayName()}</div>

          {/* Type label and subtitle */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('text-xs font-medium', typeConfig.color)}>
              {CONVERSATION_TYPE_LABELS[conversation.type]}
            </span>
            {getSubtitle() && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground truncate">{getSubtitle()}</span>
              </>
            )}
          </div>

          {/* Last message preview */}
          <p className={cn(
            "text-sm mt-1 truncate",
            hasUnread ? "text-muted-foreground font-medium" : "text-muted-foreground"
          )}>
            {senderDisplay && <span className="font-medium">{senderDisplay}: </span>}
            {lastMessagePreview}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {/* Time */}
          {lastMessageTime && (
            <span className="text-xs text-muted-foreground">{lastMessageTime}</span>
          )}

          {/* Tiered unread indicators */}
          {hasMentions ? (
            <UnreadBadge count={conversation.mention_count!} />
          ) : hasUnread ? (
            <UnreadDot />
          ) : null}
        </div>
      </div>
    </button>
  )
})

function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

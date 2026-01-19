'use client'

import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Conversation, ConversationType } from '@/lib/api/conversations.shared'
import { CONVERSATION_TYPE_LABELS } from '@/lib/api/conversations.shared'
import { UnreadBadge } from './UnreadBadge'
import { Users, Briefcase, Handshake, MessageCircle, FileQuestion } from 'lucide-react'

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
}

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
        {/* Type icon badge */}
        <div className={cn(
          'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5',
          typeConfig.bgColor
        )}>
          <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Display name */}
          <div className="font-medium text-sm truncate">{getDisplayName()}</div>

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

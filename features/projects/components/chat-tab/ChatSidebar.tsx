'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Briefcase, Handshake, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { Conversation, ConversationType } from '@/lib/api/conversations.shared'
import type { UserRole } from '@/lib/auth/types'

interface ChatSidebarProps {
  isExpanded: boolean
  conversations: Conversation[]
  selectedConversationId: string | null
  userRole: UserRole
  onConversationSelect: (conversationId: string) => void
}

// Configuration for each conversation type
const CONVERSATION_TYPE_CONFIG: Record<ConversationType, {
  icon: typeof MessageSquare
  label: string
  description: string
  color: string
  selectedColor: string
  selectedBg: string
}> = {
  project: {
    icon: MessageSquare,
    label: 'Project Chat',
    description: 'Internal team + DFY',
    color: 'text-cyan-500',
    selectedColor: 'text-cyan-400',
    selectedBg: 'bg-cyan-500/10',
  },
  workspace: {
    icon: Briefcase,
    label: 'Workspace',
    description: 'Internal only',
    color: 'text-purple-500',
    selectedColor: 'text-purple-400',
    selectedBg: 'bg-purple-500/10',
  },
  partner: {
    icon: Handshake,
    label: 'Partner Chat',
    description: 'DFY partner direct',
    color: 'text-orange-500',
    selectedColor: 'text-orange-400',
    selectedBg: 'bg-orange-500/10',
  },
  direct: {
    icon: MessageSquare,
    label: 'Direct',
    description: 'Private',
    color: 'text-blue-500',
    selectedColor: 'text-blue-400',
    selectedBg: 'bg-blue-500/10',
  },
  inquiry: {
    icon: MessageSquare,
    label: 'Inquiry',
    description: 'Inquiry chat',
    color: 'text-green-500',
    selectedColor: 'text-green-400',
    selectedBg: 'bg-green-500/10',
  },
  suggestion: {
    icon: Lightbulb,
    label: 'Suggestion',
    description: 'Suggestion thread',
    color: 'text-yellow-500',
    selectedColor: 'text-yellow-400',
    selectedBg: 'bg-yellow-500/10',
  },
}

// Determine which conversation types a role can access
function getAccessibleTypes(role: UserRole): ConversationType[] {
  switch (role) {
    case 'admin':
    case 'internal':
      return ['project', 'workspace', 'partner']
    case 'dev':
      return ['project', 'workspace']
    case 'dfy':
      return ['project', 'partner']
    case 'client':
      return ['project']
    default:
      return ['project']
  }
}

function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function ChatSidebar({
  isExpanded,
  conversations,
  selectedConversationId,
  userRole,
  onConversationSelect,
}: ChatSidebarProps) {
  const accessibleTypes = getAccessibleTypes(userRole)

  // Filter and sort conversations by type
  const visibleConversations = useMemo(() => {
    return conversations
      .filter((c) => accessibleTypes.includes(c.type))
      .sort((a, b) => {
        const order: ConversationType[] = ['project', 'workspace', 'partner']
        return order.indexOf(a.type) - order.indexOf(b.type)
      })
  }, [conversations, accessibleTypes])

  // Smooth easing curve matching design principles
  const smoothTransition = {
    duration: 0.25,
    ease: [0.25, 1, 0.5, 1] as const,
  }

  return (
    <motion.div
      className="h-full border-r border-border/50 bg-background flex flex-col"
      initial={false}
      animate={{
        width: isExpanded ? 260 : 0,
        opacity: isExpanded ? 1 : 0,
      }}
      transition={smoothTransition}
      style={{ overflow: 'hidden' }}
    >
      <div className="flex-shrink-0 px-4 py-3 border-b border-border/50">
        <span className="text-sm font-semibold text-foreground">Conversations</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-4 space-y-1">
          {visibleConversations.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 px-2">
              No conversations yet
            </p>
          ) : (
            visibleConversations.map((conversation) => {
              const config = CONVERSATION_TYPE_CONFIG[conversation.type]
              const Icon = config.icon
              const isSelected = conversation.id === selectedConversationId
              const unreadCount = conversation.unread_count || 0
              const lastMessage = conversation.last_message
              const lastMessageTime = lastMessage?.created_at
                ? formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: false })
                : null

              return (
                <button
                  key={conversation.id}
                  onClick={() => onConversationSelect(conversation.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-md transition-colors',
                    isSelected
                      ? config.selectedBg
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      'shrink-0 mt-0.5',
                      isSelected ? config.selectedColor : config.color
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Name and unread badge */}
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm font-medium truncate',
                          isSelected ? config.selectedColor : 'text-foreground'
                        )}>
                          {config.label}
                        </span>
                        {unreadCount > 0 && (
                          <span className="shrink-0 h-5 min-w-[20px] px-1.5 rounded-full bg-muted text-foreground text-xs font-medium flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>

                      {/* Last message preview */}
                      {lastMessage ? (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {lastMessage.sender?.name && (
                            <span className="font-medium">{lastMessage.sender.name}: </span>
                          )}
                          {truncate(lastMessage.content || '', 30)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          No messages yet
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    {lastMessageTime && (
                      <span className="shrink-0 text-[10px] text-muted-foreground mt-0.5">
                        {lastMessageTime}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </motion.div>
  )
}

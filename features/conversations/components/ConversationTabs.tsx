'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { Conversation, Message, ConversationType } from '@/lib/api/conversations'
import { CONVERSATION_TYPE_LABELS, CONVERSATION_TYPE_DESCRIPTIONS } from '@/lib/api/conversations'
import { ChatPanel } from './ChatPanel'
import { UnreadBadge } from './UnreadBadge'

interface Participant {
  id: string
  name: string
  email: string
}

interface ConversationData {
  conversation: Conversation
  messages: Message[]
  participants: Participant[]
}

interface ConversationTabsProps {
  conversations: ConversationData[]
  currentUserId: string
  userRole: string
  className?: string
}

// Determine which conversation types a role can access
function getAccessibleTypes(role: string): ConversationType[] {
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

export function ConversationTabs({
  conversations,
  currentUserId,
  userRole,
  className,
}: ConversationTabsProps) {
  const accessibleTypes = getAccessibleTypes(userRole)

  // Filter and sort conversations by type
  const visibleConversations = conversations
    .filter((c) => accessibleTypes.includes(c.conversation.type))
    .sort((a, b) => {
      const order: ConversationType[] = ['project', 'workspace', 'partner']
      return order.indexOf(a.conversation.type) - order.indexOf(b.conversation.type)
    })

  if (visibleConversations.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No conversations available
      </div>
    )
  }

  // Default to first accessible conversation
  const defaultTab = visibleConversations[0].conversation.type

  return (
    <Tabs defaultValue={defaultTab} className={cn('h-full flex flex-col', className)}>
      <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
        {visibleConversations.map(({ conversation }) => (
          <TabsTrigger
            key={conversation.id}
            value={conversation.type}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            <span className="flex items-center gap-2">
              {CONVERSATION_TYPE_LABELS[conversation.type]}
              {(conversation.unread_count || 0) > 0 && (
                <UnreadBadge count={conversation.unread_count || 0} />
              )}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {visibleConversations.map(({ conversation, messages, participants }) => (
        <TabsContent
          key={conversation.id}
          value={conversation.type}
          className="flex-1 mt-0 data-[state=inactive]:hidden"
        >
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 text-xs text-muted-foreground border-b">
              {CONVERSATION_TYPE_DESCRIPTIONS[conversation.type]}
            </div>
            <ChatPanel
              conversation={conversation}
              initialMessages={messages}
              currentUserId={currentUserId}
              participants={participants}
              className="flex-1 min-h-0"
            />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}

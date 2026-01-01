'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/lib/api/conversations'
import { ConversationItem } from './ConversationItem'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (conversation: Conversation) => void
  className?: string
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  className,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    return (
      conv.project?.project_name?.toLowerCase().includes(query) ||
      conv.project?.client_name?.toLowerCase().includes(query) ||
      conv.last_message?.content?.toLowerCase().includes(query)
    )
  })

  // Sort by last message time (most recent first)
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aTime = a.last_message?.created_at || a.created_at
    const bTime = b.last_message?.created_at || b.created_at
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  })

  return (
    <div className={cn('flex flex-col h-full border-r', className)}>
      {/* Search header */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {sortedConversations.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          sortedConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedId === conversation.id}
              onClick={() => onSelect(conversation)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  )
}

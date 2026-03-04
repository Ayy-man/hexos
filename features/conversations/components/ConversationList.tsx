'use client'

import { useState, useMemo } from 'react'
import { Search, Inbox, FolderKanban, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Conversation, ConversationType } from '@/lib/api/conversations.shared'
import { CONVERSATION_TYPE_LABELS } from '@/lib/api/conversations.shared'
import { ConversationItem, CONVERSATION_TYPE_CONFIG } from './ConversationItem'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (conversation: Conversation) => void
  currentUserId?: string
  tabId?: string
  className?: string
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  currentUserId,
  tabId,
  className,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ConversationType | 'all'>('all')

  // Get unique conversation types in the list
  const availableTypes = useMemo(() => {
    const types = new Set(conversations.map((c) => c.type))
    return Array.from(types) as ConversationType[]
  }, [conversations])

  // Filter conversations by search query and type
  const filteredConversations = useMemo(() => conversations.filter((conv) => {
    // Type filter
    if (typeFilter !== 'all' && conv.type !== typeFilter) return false

    // Search filter
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    return (
      conv.project?.project_name?.toLowerCase().includes(query) ||
      conv.project?.client_name?.toLowerCase().includes(query) ||
      conv.last_message?.content?.toLowerCase().includes(query)
    )
  }), [conversations, typeFilter, searchQuery])

  // Sort by last message time (most recent first)
  const sortedConversations = useMemo(() => [...filteredConversations].sort((a, b) => {
    const aTime = a.last_message?.created_at || a.created_at
    const bTime = b.last_message?.created_at || b.created_at
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  }), [filteredConversations])

  return (
    <div className={cn('flex flex-col h-full border-r', className)}>
      {/* Search header */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9"
          />
        </div>

        {/* Quick type filters - only show if there are multiple types */}
        {availableTypes.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('all')}
              className="h-7 text-xs"
            >
              All
            </Button>
            {availableTypes.map((type) => {
              const config = CONVERSATION_TYPE_CONFIG[type]
              const TypeIcon = config.icon
              const isActive = typeFilter === type
              return (
                <Button
                  key={type}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    'h-7 text-xs gap-1.5',
                    !isActive && config.color
                  )}
                >
                  <TypeIcon className="h-3 w-3" />
                  {CONVERSATION_TYPE_LABELS[type]}
                </Button>
              )
            })}
          </div>
        )}
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-muted-foreground">
            {searchQuery ? (
              <>
                <Search className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm font-medium">No results</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </>
            ) : tabId === 'inbox' ? (
              <>
                <Inbox className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm font-medium">No direct messages</p>
                <p className="text-xs mt-1">Start a conversation with a teammate</p>
              </>
            ) : tabId === 'projects' ? (
              <>
                <FolderKanban className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm font-medium">No project conversations</p>
                <p className="text-xs mt-1">Conversations are created when projects start</p>
              </>
            ) : tabId === 'inquiries' ? (
              <>
                <FileText className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm font-medium">No inquiry discussions</p>
                <p className="text-xs mt-1">Discussions appear when inquiries are submitted</p>
              </>
            ) : (
              <>
                <Search className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm font-medium">No conversations yet</p>
              </>
            )}
          </div>
        ) : (
          sortedConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedId === conversation.id}
              onClick={() => onSelect(conversation)}
              currentUserId={currentUserId}
            />
          ))
        )}
      </ScrollArea>
    </div>
  )
}

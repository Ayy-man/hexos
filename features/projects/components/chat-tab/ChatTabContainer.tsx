'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChatSidebar } from './ChatSidebar'
import { ChatPanel } from '@/features/conversations/components/ChatPanel'
import { MessageSquare } from 'lucide-react'
import type { Conversation, Message, ConversationType } from '@/lib/api/conversations.shared'
import type { UserRole } from '@/lib/auth/types'

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

interface ChatTabContainerProps {
  projectId: string
  currentUserId: string
  userRole: UserRole
  isExpanded: boolean
  preloadedData?: ConversationData[] | null
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

export function ChatTabContainer({
  projectId,
  currentUserId,
  userRole,
  isExpanded,
  preloadedData,
}: ChatTabContainerProps) {
  const [conversationsData, setConversationsData] = useState<ConversationData[]>(
    preloadedData || []
  )
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  // Update state when preloaded data arrives
  useEffect(() => {
    if (preloadedData && preloadedData.length > 0) {
      setConversationsData(preloadedData)
      // Auto-select first accessible conversation if none selected
      if (!selectedConversationId) {
        const accessibleTypes = getAccessibleTypes(userRole)
        const firstAccessible = preloadedData.find(d =>
          accessibleTypes.includes(d.conversation.type)
        )
        if (firstAccessible) {
          setSelectedConversationId(firstAccessible.conversation.id)
        }
      }
    }
  }, [preloadedData, selectedConversationId, userRole])

  // Extract conversations for sidebar
  const conversations = useMemo(() => {
    return conversationsData.map(d => d.conversation)
  }, [conversationsData])

  // Get selected conversation data
  const selectedData = useMemo(() => {
    if (!selectedConversationId) return null
    return conversationsData.find(d => d.conversation.id === selectedConversationId) || null
  }, [conversationsData, selectedConversationId])

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId)
  }

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <ChatSidebar
        isExpanded={isExpanded}
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        userRole={userRole}
        onConversationSelect={handleConversationSelect}
      />

      {/* Main content area */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedData ? (
          <ChatPanel
            key={selectedData.conversation.id}
            conversation={selectedData.conversation}
            initialMessages={selectedData.messages}
            currentUserId={currentUserId}
            participants={selectedData.participants}
            className="h-full"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
            <p className="text-sm text-muted-foreground">
              Select a conversation from the sidebar to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

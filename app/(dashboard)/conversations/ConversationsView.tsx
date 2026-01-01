'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ConversationList, ChatPanel } from '@/features/conversations/components'
import type { Conversation, Message } from '@/lib/api/conversations'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare } from 'lucide-react'

interface Participant {
  id: string
  name: string
  email: string
}

interface ConversationsViewProps {
  conversations: Conversation[]
  currentUserId: string
  userRole: string
}

export function ConversationsView({
  conversations: initialConversations,
  currentUserId,
  userRole,
}: ConversationsViewProps) {
  const [conversations, setConversations] = useState(initialConversations)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversation) return

    // Capture the conversation to avoid null reference issues in async code
    const conversation = selectedConversation

    async function loadConversationData() {
      setIsLoadingMessages(true)

      try {
        const supabase = createClient()

        // Load messages
        const { data: msgs, error: msgError } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id(id, name, email),
            attachments:message_attachments(*),
            reactions:message_reactions(
              *,
              user:profiles!user_id(id, name)
            ),
            mentions:message_mentions(
              *,
              mentioned_user:profiles!mentioned_user_id(id, name, email)
            )
          `)
          .eq('conversation_id', conversation.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })

        if (msgError) throw msgError
        setMessages(msgs || [])

        // Load participants
        const parts = await loadParticipants(
          supabase,
          conversation.project_id,
          conversation.type
        )
        setParticipants(parts)
      } catch (err) {
        console.error('Failed to load conversation:', err)
      } finally {
        setIsLoadingMessages(false)
      }
    }

    loadConversationData()
  }, [selectedConversation])

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left panel: Conversation list */}
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversation?.id || null}
        onSelect={handleSelectConversation}
        className="w-80 shrink-0"
      />

      {/* Right panel: Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversation ? (
          isLoadingMessages ? (
            <div className="flex-1 p-4 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <ChatPanel
              conversation={selectedConversation}
              initialMessages={messages}
              currentUserId={currentUserId}
              participants={participants}
              className="h-full"
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a conversation from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

async function loadParticipants(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  conversationType: string
): Promise<Participant[]> {
  // Get project relationships
  const { data: project } = await supabase
    .from('projects')
    .select(`
      dfy_partner_id,
      assigned_dev_id,
      client_id,
      dfy_partner:profiles!dfy_partner_id(id, name, email),
      assigned_dev:profiles!assigned_dev_id(id, name, email),
      client:profiles!client_id(id, name, email)
    `)
    .eq('id', projectId)
    .single()

  if (!project) return []

  // Get all admin/internal users
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('role', ['admin', 'internal'])

  const participants: Participant[] = [...(admins || [])]

  // Add role-specific participants based on conversation type
  if (conversationType === 'project') {
    if (project.dfy_partner) participants.push(project.dfy_partner as unknown as Participant)
    if (project.assigned_dev) participants.push(project.assigned_dev as unknown as Participant)
    if (project.client) participants.push(project.client as unknown as Participant)
  } else if (conversationType === 'workspace') {
    if (project.assigned_dev) participants.push(project.assigned_dev as unknown as Participant)
  } else if (conversationType === 'partner') {
    if (project.dfy_partner) participants.push(project.dfy_partner as unknown as Participant)
  }

  // Remove duplicates
  const uniqueParticipants = Array.from(
    new Map(participants.map((p) => [p.id, p])).values()
  )

  return uniqueParticipants
}

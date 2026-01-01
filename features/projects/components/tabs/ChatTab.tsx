'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ConversationTabs } from '@/features/conversations/components'
import type { Conversation, Message } from '@/lib/api/conversations.shared'
import { Skeleton } from '@/components/ui/skeleton'

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

interface ChatTabProps {
  projectId: string
  currentUserId: string
  userRole: string
}

export function ChatTab({ projectId, currentUserId, userRole }: ChatTabProps) {
  const [conversationsData, setConversationsData] = useState<ConversationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadConversations() {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        // Get all conversations for this project
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select(`
            *,
            project:projects(id, project_name, client_name)
          `)
          .eq('project_id', projectId)
          .order('type')

        if (convError) throw convError
        if (!conversations || conversations.length === 0) {
          setConversationsData([])
          return
        }

        // Load messages and participants for each conversation
        const results: ConversationData[] = []

        for (const conv of conversations) {
          // Get messages
          const { data: messages, error: msgError } = await supabase
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
            .eq('conversation_id', conv.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })

          if (msgError) throw msgError

          // Get unread count
          const { data: readStatus } = await supabase
            .from('conversation_read_status')
            .select('last_read_at')
            .eq('conversation_id', conv.id)
            .eq('user_id', currentUserId)
            .single()

          const lastReadAt = readStatus?.last_read_at || '1970-01-01T00:00:00Z'

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .is('deleted_at', null)
            .gt('created_at', lastReadAt)
            .neq('sender_id', currentUserId)

          // Get participants based on conversation type
          const participants = await loadParticipants(supabase, projectId, conv.type)

          results.push({
            conversation: {
              ...conv,
              unread_count: unreadCount || 0,
              last_message: messages?.[messages.length - 1] || null,
            },
            messages: messages || [],
            participants,
          })
        }

        setConversationsData(results)
      } catch (err) {
        console.error('Failed to load conversations:', err)
        setError('Failed to load conversations')
      } finally {
        setIsLoading(false)
      }
    }

    loadConversations()
  }, [projectId, currentUserId])

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-destructive">
        {error}
      </div>
    )
  }

  if (conversationsData.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No conversations available for this project
      </div>
    )
  }

  return (
    <div className="h-[600px]">
      <ConversationTabs
        conversations={conversationsData}
        currentUserId={currentUserId}
        userRole={userRole}
      />
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

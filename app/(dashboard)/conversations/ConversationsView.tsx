'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { ConversationList, ChatPanel } from '@/features/conversations/components'
import { UnreadBadge } from '@/features/conversations/components/UnreadBadge'
import type { Conversation, Message } from '@/lib/api/conversations.shared'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, FolderKanban, FileText, Inbox, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Participant {
  id: string
  name: string
  email: string
}

interface ConversationsViewProps {
  directConversations: Conversation[]
  projectConversations: Conversation[]
  inquiryConversations: Conversation[]
  currentUserId: string
  userRole: string
}

export function ConversationsView({
  directConversations: initialDirect,
  projectConversations: initialProject,
  inquiryConversations: initialInquiry,
  currentUserId,
  userRole,
}: ConversationsViewProps) {
  const [activeTab, setActiveTab] = useState('inbox')
  const [directConversations] = useState(initialDirect)
  const [projectConversations] = useState(initialProject)
  const [inquiryConversations] = useState(initialInquiry)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  // Calculate unread counts for each tab
  const directUnread = directConversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
  const projectUnread = projectConversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
  const inquiryUnread = inquiryConversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)

  // Get conversations for current tab
  const getCurrentConversations = () => {
    switch (activeTab) {
      case 'inbox':
        return directConversations
      case 'projects':
        return projectConversations
      case 'inquiries':
        return inquiryConversations
      default:
        return []
    }
  }

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversation) return

    const conversation = selectedConversation

    async function loadConversationData() {
      setIsLoadingMessages(true)

      try {
        const supabase = createClient()

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

        // Load participants based on conversation type
        const parts = await loadParticipants(supabase, conversation)
        setParticipants(parts)
      } catch (err) {
        console.error('Failed to load conversation:', err)
      } finally {
        setIsLoadingMessages(false)
      }
    }

    loadConversationData()
  }, [selectedConversation])

  // Clear selection when changing tabs
  useEffect(() => {
    setSelectedConversation(null)
    setMessages([])
    setParticipants([])
  }, [activeTab])

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header with tabs */}
      <div className="border-b">
        <div className="px-6 pt-4 pb-0">
          <h1 className="text-2xl font-semibold">Conversations</h1>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6">
            <TabsList className="h-12 bg-transparent p-0 border-b-0">
              <TabsTrigger
                value="inbox"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
              >
                <Inbox className="h-4 w-4" />
                Inbox
                {directUnread > 0 && <UnreadBadge count={directUnread} />}
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
              >
                <FolderKanban className="h-4 w-4" />
                Projects
                {projectUnread > 0 && <UnreadBadge count={projectUnread} />}
              </TabsTrigger>
              <TabsTrigger
                value="inquiries"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
              >
                <FileText className="h-4 w-4" />
                Inquiries
                {inquiryUnread > 0 && <UnreadBadge count={inquiryUnread} />}
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: Conversation list */}
        <div className="w-80 shrink-0 border-r flex flex-col">
          {activeTab === 'inbox' && (
            <div className="p-3 border-b">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                New Message
              </Button>
            </div>
          )}
          <ConversationList
            conversations={getCurrentConversations()}
            selectedId={selectedConversation?.id || null}
            onSelect={handleSelectConversation}
            className="flex-1 border-r-0"
          />
        </div>

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
                <p className="text-sm">
                  {activeTab === 'inbox'
                    ? 'Choose a conversation or start a new one'
                    : activeTab === 'projects'
                    ? 'Select a project conversation to view messages'
                    : 'Select an inquiry to view the discussion'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

async function loadParticipants(
  supabase: ReturnType<typeof createClient>,
  conversation: Conversation
): Promise<Participant[]> {
  // For direct conversations, participants are already loaded
  if (conversation.type === 'direct' && conversation.participants) {
    return conversation.participants
      .map((p) => p.user)
      .filter((u): u is Participant => u !== undefined)
  }

  // For inquiry conversations
  if (conversation.type === 'inquiry' && conversation.inquiry_id) {
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select(`
        submitted_by,
        assigned_dev_id,
        submitter:profiles!submitted_by(id, name, email),
        assigned_dev:profiles!assigned_dev_id(id, name, email)
      `)
      .eq('id', conversation.inquiry_id)
      .single()

    if (!inquiry) return []

    const participants: Participant[] = []

    // Get admin/internal users
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('role', ['admin', 'internal'])

    if (admins) participants.push(...admins)

    if (inquiry.submitter) participants.push(inquiry.submitter as unknown as Participant)
    if (inquiry.assigned_dev) participants.push(inquiry.assigned_dev as unknown as Participant)

    return Array.from(new Map(participants.map((p) => [p.id, p])).values())
  }

  // For project conversations
  if (conversation.project_id) {
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
      .eq('id', conversation.project_id)
      .single()

    if (!project) return []

    const { data: admins } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('role', ['admin', 'internal'])

    const participants: Participant[] = [...(admins || [])]

    if (conversation.type === 'project') {
      if (project.dfy_partner) participants.push(project.dfy_partner as unknown as Participant)
      if (project.assigned_dev) participants.push(project.assigned_dev as unknown as Participant)
      if (project.client) participants.push(project.client as unknown as Participant)
    } else if (conversation.type === 'workspace') {
      if (project.assigned_dev) participants.push(project.assigned_dev as unknown as Participant)
    } else if (conversation.type === 'partner') {
      if (project.dfy_partner) participants.push(project.dfy_partner as unknown as Participant)
    }

    return Array.from(new Map(participants.map((p) => [p.id, p])).values())
  }

  return []
}

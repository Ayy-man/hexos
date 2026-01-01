import { createClient } from '@/lib/supabase/server'

// Re-export types and constants from shared file for convenience
export type {
  ConversationType,
  Conversation,
  Message,
  MessageAttachment,
  MessageReaction,
  MessageMention,
  ConversationReadStatus,
} from './conversations.shared'

export {
  CONVERSATION_TYPE_LABELS,
  CONVERSATION_TYPE_DESCRIPTIONS,
} from './conversations.shared'

// Import types for local use
import type { Conversation, Message, MessageReaction, ConversationType } from './conversations.shared'

// ============================================
// Query Functions
// ============================================

/**
 * Get all conversations for a project
 */
export async function getProjectConversations(projectId: string): Promise<Conversation[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      project:projects(id, project_name, client_name)
    `)
    .eq('project_id', projectId)
    .order('type')

  if (error) throw error

  // Get unread counts for each conversation
  const conversationsWithUnread = await Promise.all(
    (data || []).map(async (conv) => {
      const unreadCount = await getConversationUnreadCount(conv.id, user.id)
      const lastMessage = await getLastMessage(conv.id)
      return { ...conv, unread_count: unreadCount, last_message: lastMessage }
    })
  )

  return conversationsWithUnread
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      project:projects(id, project_name, client_name)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  const unreadCount = await getConversationUnreadCount(id, user.id)
  const lastMessage = await getLastMessage(id)

  return { ...data, unread_count: unreadCount, last_message: lastMessage }
}

/**
 * Get all conversations the user has access to (for global inbox)
 */
export async function getAllConversationsWithUnread(): Promise<Conversation[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // RLS will filter to only accessible conversations
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      project:projects(id, project_name, client_name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get unread counts and last messages for each
  const conversationsWithData = await Promise.all(
    (data || []).map(async (conv) => {
      const unreadCount = await getConversationUnreadCount(conv.id, user.id)
      const lastMessage = await getLastMessage(conv.id)
      return { ...conv, unread_count: unreadCount, last_message: lastMessage }
    })
  )

  // Sort by last message date (most recent first)
  return conversationsWithData.sort((a, b) => {
    const aDate = a.last_message?.created_at || a.created_at
    const bDate = b.last_message?.created_at || b.created_at
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })
}

/**
 * Get messages for a conversation with pagination
 */
export async function getConversationMessages(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<Message[]> {
  const supabase = await createClient()

  let query = supabase
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
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query

  if (error) throw error

  // Reverse to show oldest first in the UI
  return (data || []).reverse()
}

/**
 * Get participants who can be @mentioned in a conversation
 */
export async function getConversationParticipants(conversationId: string): Promise<Array<{ id: string; name: string; email: string }>> {
  const supabase = await createClient()

  // Get conversation to find project
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('project_id, type')
    .eq('id', conversationId)
    .single()

  if (convError) throw convError

  // Get project relationships
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select(`
      dfy_partner_id,
      assigned_dev_id,
      client_id,
      dfy_partner:profiles!dfy_partner_id(id, name, email),
      assigned_dev:profiles!assigned_dev_id(id, name, email),
      client:profiles!client_id(id, name, email)
    `)
    .eq('id', conv.project_id)
    .single()

  if (projError) throw projError

  // Get all admin/internal users
  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('role', ['admin', 'internal'])

  if (adminError) throw adminError

  const participants: Array<{ id: string; name: string; email: string }> = [...(admins || [])]

  // Add role-specific participants based on conversation type
  const convType = conv.type as ConversationType

  type ProfileInfo = { id: string; name: string; email: string }

  if (convType === 'project') {
    // Everyone
    if (project.dfy_partner) participants.push(project.dfy_partner as unknown as ProfileInfo)
    if (project.assigned_dev) participants.push(project.assigned_dev as unknown as ProfileInfo)
    if (project.client) participants.push(project.client as unknown as ProfileInfo)
  } else if (convType === 'workspace') {
    // Admin, internal, dev
    if (project.assigned_dev) participants.push(project.assigned_dev as unknown as ProfileInfo)
  } else if (convType === 'partner') {
    // Admin, internal, dfy
    if (project.dfy_partner) participants.push(project.dfy_partner as unknown as ProfileInfo)
  }

  // Remove duplicates
  const uniqueParticipants = Array.from(
    new Map(participants.map(p => [p.id, p])).values()
  )

  return uniqueParticipants
}

// ============================================
// Helper Functions
// ============================================

async function getConversationUnreadCount(conversationId: string, userId: string): Promise<number> {
  const supabase = await createClient()

  // Get last read time
  const { data: readStatus } = await supabase
    .from('conversation_read_status')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single()

  const lastReadAt = readStatus?.last_read_at || '1970-01-01T00:00:00Z'

  // Count messages after last read
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .gt('created_at', lastReadAt)
    .neq('sender_id', userId)

  if (error) return 0
  return count || 0
}

async function getLastMessage(conversationId: string): Promise<Message | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(id, name, email)
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}

// ============================================
// Mutation Functions
// ============================================

/**
 * Send a new message
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  mentionedUserIds?: string[]
): Promise<Message> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Create the message
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    })
    .select(`
      *,
      sender:profiles!sender_id(id, name, email)
    `)
    .single()

  if (error) throw error

  // Create mentions if any
  if (mentionedUserIds && mentionedUserIds.length > 0) {
    const mentions = mentionedUserIds.map(userId => ({
      message_id: message.id,
      mentioned_user_id: userId,
    }))

    await supabase.from('message_mentions').insert(mentions)
  }

  // Update sender's read status to now
  await markConversationRead(conversationId, message.id)

  return message
}

/**
 * Edit a message (own messages only)
 */
export async function editMessage(messageId: string, content: string): Promise<Message> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('messages')
    .update({
      content,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('sender_id', user.id) // Ensure own message
    .select(`
      *,
      sender:profiles!sender_id(id, name, email)
    `)
    .single()

  if (error) throw error
  return data
}

/**
 * Soft delete a message (own messages only)
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('messages')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('sender_id', user.id) // Ensure own message

  if (error) throw error
}

/**
 * Add a reaction to a message
 */
export async function addReaction(messageId: string, emoji: string): Promise<MessageReaction> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('message_reactions')
    .insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    })
    .select(`
      *,
      user:profiles!user_id(id, name)
    `)
    .single()

  if (error) {
    // If duplicate, ignore
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('message_reactions')
        .select(`*, user:profiles!user_id(id, name)`)
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single()
      return existing!
    }
    throw error
  }

  return data
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(messageId: string, emoji: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)

  if (error) throw error
}

/**
 * Toggle a reaction (add if not exists, remove if exists)
 */
export async function toggleReaction(messageId: string, emoji: string): Promise<{ added: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Check if reaction exists
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .single()

  if (existing) {
    await removeReaction(messageId, emoji)
    return { added: false }
  } else {
    await addReaction(messageId, emoji)
    return { added: true }
  }
}

/**
 * Mark a conversation as read up to a specific message
 */
export async function markConversationRead(
  conversationId: string,
  lastMessageId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('conversation_read_status')
    .upsert({
      conversation_id: conversationId,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
      last_read_message_id: lastMessageId,
    }, {
      onConflict: 'conversation_id,user_id',
    })

  if (error) throw error
}

/**
 * Get total unread count across all conversations for current user
 */
export async function getTotalUnreadCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return 0

  const conversations = await getAllConversationsWithUnread()
  return conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
}

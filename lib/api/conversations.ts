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
  DirectConversationParticipant,
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
 * Get direct message conversations for current user
 */
export async function getDirectConversations(): Promise<Conversation[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get conversations where user is a participant
  const { data: participations, error: partError } = await supabase
    .from('direct_conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id)

  if (partError) throw partError
  if (!participations || participations.length === 0) return []

  const conversationIds = participations.map(p => p.conversation_id)

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participants:direct_conversation_participants(
        *,
        user:profiles!user_id(id, name, email)
      )
    `)
    .in('id', conversationIds)
    .eq('type', 'direct')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get unread counts and last messages
  const conversationsWithData = await Promise.all(
    (data || []).map(async (conv) => {
      const unreadCount = await getConversationUnreadCount(conv.id, user.id)
      const lastMessage = await getLastMessage(conv.id)
      return { ...conv, unread_count: unreadCount, last_message: lastMessage }
    })
  )

  return conversationsWithData.sort((a, b) => {
    const aDate = a.last_message?.created_at || a.created_at
    const bDate = b.last_message?.created_at || b.created_at
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })
}

/**
 * Get inquiry conversations for current user
 */
export async function getInquiryConversations(): Promise<Conversation[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      inquiry:inquiries!inquiry_id(id, project_type, client_name, status)
    `)
    .eq('type', 'inquiry')
    .not('inquiry_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get unread counts and last messages
  const conversationsWithData = await Promise.all(
    (data || []).map(async (conv) => {
      const unreadCount = await getConversationUnreadCount(conv.id, user.id)
      const lastMessage = await getLastMessage(conv.id)
      return { ...conv, unread_count: unreadCount, last_message: lastMessage }
    })
  )

  return conversationsWithData.sort((a, b) => {
    const aDate = a.last_message?.created_at || a.created_at
    const bDate = b.last_message?.created_at || b.created_at
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })
}

/**
 * Get suggestion conversations for current user
 * For DFY/Dev: returns conversations for their own suggestions
 * For Admin/Internal: returns all suggestion conversations
 */
export async function getSuggestionConversations(): Promise<Conversation[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      suggestion:suggestions!suggestion_id(id, title, status, user_id)
    `)
    .eq('type', 'suggestion')
    .not('suggestion_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get unread counts and last messages
  const conversationsWithData = await Promise.all(
    (data || []).map(async (conv) => {
      const unreadCount = await getConversationUnreadCount(conv.id, user.id)
      const lastMessage = await getLastMessage(conv.id)
      return { ...conv, unread_count: unreadCount, last_message: lastMessage }
    })
  )

  return conversationsWithData.sort((a, b) => {
    const aDate = a.last_message?.created_at || a.created_at
    const bDate = b.last_message?.created_at || b.created_at
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })
}

/**
 * Get project conversations only (excludes direct and inquiry)
 */
export async function getProjectConversationsOnly(): Promise<Conversation[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      project:projects(id, project_name, client_name)
    `)
    .in('type', ['project', 'workspace', 'partner'])
    .not('project_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get unread counts and last messages
  const conversationsWithData = await Promise.all(
    (data || []).map(async (conv) => {
      const unreadCount = await getConversationUnreadCount(conv.id, user.id)
      const lastMessage = await getLastMessage(conv.id)
      return { ...conv, unread_count: unreadCount, last_message: lastMessage }
    })
  )

  return conversationsWithData.sort((a, b) => {
    const aDate = a.last_message?.created_at || a.created_at
    const bDate = b.last_message?.created_at || b.created_at
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })
}

/**
 * Create a direct conversation between users
 */
export async function createDirectConversation(
  participantIds: string[],
  title?: string
): Promise<Conversation> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Include current user in participants
  const allParticipants = [...new Set([user.id, ...participantIds])]

  if (allParticipants.length < 2) {
    throw new Error('Direct conversation requires at least 2 participants')
  }

  // Create the conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert({
      type: 'direct',
      title: title || null,
    })
    .select()
    .single()

  if (convError) throw convError

  // Add participants
  const participants = allParticipants.map(userId => ({
    conversation_id: conv.id,
    user_id: userId,
  }))

  const { error: partError } = await supabase
    .from('direct_conversation_participants')
    .insert(participants)

  if (partError) {
    // Cleanup conversation if participants fail
    await supabase.from('conversations').delete().eq('id', conv.id)
    throw partError
  }

  return conv
}

/**
 * Find existing direct conversation with specific participants
 */
export async function findDirectConversation(participantIds: string[]): Promise<Conversation | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const allParticipants = [...new Set([user.id, ...participantIds])].sort()

  // Get user's direct conversations
  const { data: userConvs, error } = await supabase
    .from('direct_conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id)

  if (error) throw error
  if (!userConvs || userConvs.length === 0) return null

  // Check each conversation for matching participants
  for (const { conversation_id } of userConvs) {
    const { data: convParticipants } = await supabase
      .from('direct_conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversation_id)

    if (!convParticipants) continue

    const convUserIds = convParticipants.map(p => p.user_id).sort()

    if (convUserIds.length === allParticipants.length &&
        convUserIds.every((id, i) => id === allParticipants[i])) {
      // Found matching conversation
      const { data: conv } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversation_id)
        .single()

      return conv
    }
  }

  return null
}

/**
 * Get or create a direct conversation with specific participants
 */
export async function getOrCreateDirectConversation(
  participantIds: string[],
  title?: string
): Promise<Conversation> {
  const existing = await findDirectConversation(participantIds)
  if (existing) return existing
  return createDirectConversation(participantIds, title)
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
    .maybeSingle()

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
 * Send a new message (and sync to inquiry_comments for inquiry conversations)
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

  // Sync to inquiry_comments for inquiry conversations
  await syncMessageToInquiryComment(supabase, conversationId, message, user.id)

  return message
}

/**
 * Sync a message to inquiry_comments table (for inquiry conversations)
 */
async function syncMessageToInquiryComment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  message: Message,
  userId: string
): Promise<void> {
  try {
    // Check if this is an inquiry conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('type, inquiry_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation || conversation.type !== 'inquiry' || !conversation.inquiry_id) {
      return // Not an inquiry conversation, skip sync
    }

    // Get the user's role to determine comment_type
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.warn('[Sync] Could not get user profile for comment_type')
      return
    }

    // Map role to comment_type: admin/internal -> 'internal', dfy -> 'dfy'
    const commentType = ['admin', 'internal'].includes(profile.role) ? 'internal' : 'dfy'

    // Create the synced inquiry_comment
    const { data: comment, error: commentError } = await supabase
      .from('inquiry_comments')
      .insert({
        inquiry_id: conversation.inquiry_id,
        content: message.content,
        comment_type: commentType,
        author_id: userId,
        created_at: message.created_at,
        synced_message_id: message.id,
      })
      .select('id')
      .single()

    if (commentError) {
      console.error('[Sync] Failed to create inquiry_comment:', commentError)
      return
    }

    // Update the message with the synced comment ID
    await supabase
      .from('messages')
      .update({ synced_inquiry_comment_id: comment.id })
      .eq('id', message.id)
  } catch (err) {
    console.error('[Sync] Error syncing message to inquiry_comment:', err)
  }
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

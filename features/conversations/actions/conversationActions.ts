'use server'

import { revalidatePath } from 'next/cache'
import {
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  markConversationRead,
  getConversation,
  getProjectConversations,
  getConversationMessages,
  getConversationParticipants,
} from '@/lib/api/conversations'
import type { Conversation, Message } from '@/lib/api/conversations.shared'
import { uploadMessageAttachments, getAttachmentSignedUrl } from '@/lib/api/message-attachments'

// ============================================
// Start Direct Conversation
// ============================================

export async function startDirectConversationAction(
  participantId: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    const { getOrCreateDirectConversation } = await import('@/lib/api/conversations')
    const conversation = await getOrCreateDirectConversation([participantId])

    revalidatePath('/conversations')

    return { success: true, conversationId: conversation.id }
  } catch (error) {
    console.error('Failed to start direct conversation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to start conversation' }
  }
}

// ============================================
// Get Users for New Message
// ============================================

export async function getMessageableUsersAction(): Promise<
  { id: string; name: string; email: string; role: string; avatar_url: string | null }[]
> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, avatar_url')
    .neq('id', user.id)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// ============================================
// Send Message
// ============================================

export async function sendMessageAction(
  conversationId: string,
  content: string,
  mentionedUserIds?: string[]
): Promise<{ messageId: string }> {
  const message = await sendMessage(conversationId, content, mentionedUserIds)

  // Get conversation to find project for revalidation
  const conv = await getConversation(conversationId)
  if (conv?.project_id) {
    revalidatePath(`/projects/${conv.project_id}`)
  }
  revalidatePath('/conversations')

  return { messageId: message.id }
}

// ============================================
// Send Message with Attachments
// ============================================

export async function sendMessageWithAttachmentsAction(
  conversationId: string,
  content: string,
  formData: FormData,
  mentionedUserIds?: string[]
): Promise<{ messageId: string }> {
  // First send the message
  const message = await sendMessage(conversationId, content, mentionedUserIds)

  // Then upload attachments if any
  const files = formData.getAll('files') as File[]
  if (files.length > 0) {
    await uploadMessageAttachments(message.id, conversationId, files)
  }

  // Revalidate
  const conv = await getConversation(conversationId)
  if (conv?.project_id) {
    revalidatePath(`/projects/${conv.project_id}`)
  }
  revalidatePath('/conversations')

  return { messageId: message.id }
}

// ============================================
// Edit Message
// ============================================

export async function editMessageAction(
  messageId: string,
  content: string
): Promise<void> {
  await editMessage(messageId, content)
}

// ============================================
// Delete Message
// ============================================

export async function deleteMessageAction(messageId: string): Promise<void> {
  await deleteMessage(messageId)
}

// ============================================
// Toggle Reaction
// ============================================

export async function toggleReactionAction(
  messageId: string,
  emoji: string
): Promise<{ added: boolean }> {
  return await toggleReaction(messageId, emoji)
}

// ============================================
// Mark as Read
// ============================================

export async function markReadAction(
  conversationId: string,
  lastMessageId: string
): Promise<void> {
  await markConversationRead(conversationId, lastMessageId)

  // Revalidate to update unread counts
  const conv = await getConversation(conversationId)
  if (conv?.project_id) {
    revalidatePath(`/projects/${conv.project_id}`)
  }
  revalidatePath('/conversations')
}

// ============================================
// Upload Attachment to Existing Message
// ============================================

export async function uploadAttachmentAction(
  messageId: string,
  conversationId: string,
  formData: FormData
): Promise<{ attachmentIds: string[] }> {
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    throw new Error('No files provided')
  }

  const attachments = await uploadMessageAttachments(messageId, conversationId, files)

  return { attachmentIds: attachments.map((a) => a.id) }
}

// ============================================
// Get Attachment Signed URL
// ============================================

export async function getAttachmentSignedUrlAction(
  filePath: string
): Promise<string> {
  return await getAttachmentSignedUrl(filePath)
}

// ============================================
// Get Project Conversations with Messages
// ============================================

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

export async function getProjectConversationsAction(
  projectId: string
): Promise<{ conversations: ConversationData[]; error?: string }> {
  try {
    const conversations = await getProjectConversations(projectId)

    // Load messages and participants for each conversation in parallel
    const results: ConversationData[] = await Promise.all(
      conversations.map(async (conversation) => {
        const [messages, participants] = await Promise.all([
          getConversationMessages(conversation.id, 50),
          getConversationParticipants(conversation.id),
        ])

        return {
          conversation,
          messages,
          participants,
        }
      })
    )

    return { conversations: results }
  } catch (error) {
    console.error('[getProjectConversationsAction] Failed:', error)
    return { conversations: [], error: 'Failed to load conversations' }
  }
}

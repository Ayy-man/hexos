// Shared types and constants for conversations - safe to use in client components
// This file must NOT import from server-only modules

export type ConversationType = 'project' | 'workspace' | 'partner' | 'direct' | 'inquiry' | 'suggestion'

export interface Conversation {
  id: string
  project_id: string | null
  inquiry_id?: string | null
  suggestion_id?: string | null
  title?: string | null
  type: ConversationType
  created_at: string
  // Virtual fields from joins
  project?: {
    id: string
    project_name: string
    client_name: string
  } | null
  inquiry?: {
    id: string
    project_type: string
    client_name: string
    status: string
  } | null
  participants?: DirectConversationParticipant[]
  unread_count?: number
  last_message?: Message | null
}

export interface DirectConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  edited_at: string | null
  deleted_at: string | null
  created_at: string
  // Sync fields for bidirectional sync with inquiry_comments
  synced_inquiry_comment_id?: string | null
  // Joined fields
  sender?: {
    id: string
    name: string
    email: string
  }
  attachments?: MessageAttachment[]
  reactions?: MessageReaction[]
  mentions?: MessageMention[]
}

export interface MessageAttachment {
  id: string
  message_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  created_at: string
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  user?: {
    id: string
    name: string
  }
}

export interface MessageMention {
  id: string
  message_id: string
  mentioned_user_id: string
  created_at: string
  mentioned_user?: {
    id: string
    name: string
    email: string
  }
}

export interface ConversationReadStatus {
  id: string
  conversation_id: string
  user_id: string
  last_read_at: string
  last_read_message_id: string | null
}

export const CONVERSATION_TYPE_LABELS: Record<ConversationType, string> = {
  project: 'Project Chat',
  workspace: 'Workspace',
  partner: 'Partner Chat',
  direct: 'Direct Message',
  inquiry: 'Inquiry',
  suggestion: 'Suggestion',
}

export const CONVERSATION_TYPE_DESCRIPTIONS: Record<ConversationType, string> = {
  project: 'Visible to everyone on this project',
  workspace: 'Internal team + developer only',
  partner: 'Internal team + DFY partner only',
  direct: 'Private conversation',
  inquiry: 'Discussion about this inquiry',
  suggestion: 'Discussion about this suggestion',
}

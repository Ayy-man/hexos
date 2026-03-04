'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { Conversation, Message, ConversationType } from '@/lib/api/conversations.shared'
import { CONVERSATION_TYPE_LABELS, CONVERSATION_TYPE_DESCRIPTIONS } from '@/lib/api/conversations.shared'
import { useMessagesRealtime } from '@/hooks/use-messages-realtime'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import {
  sendMessageWithAttachmentsAction,
  editMessageAction,
  deleteMessageAction,
  toggleReactionAction,
  markReadAction,
  getAttachmentSignedUrlAction,
} from '../actions/conversationActions'

interface Participant {
  id: string
  name: string
  email: string
}

interface ChatPanelProps {
  conversation: Conversation
  initialMessages: Message[]
  currentUserId: string
  participants: Participant[]
  className?: string
}

export function ChatPanel({
  conversation,
  initialMessages,
  currentUserId,
  participants,
  className,
}: ChatPanelProps) {
  const { messages, refetch } = useMessagesRealtime({
    conversationId: conversation.id,
    initialMessages,
  })

  const [isSending, setIsSending] = useState(false)

  // Mark as read when viewing
  const markAsRead = useCallback(async () => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      await markReadAction(conversation.id, lastMessage.id)
    }
  }, [conversation.id, messages])

  // Mark as read on mount and when messages change
  useState(() => {
    markAsRead()
  })

  const handleSend = async (content: string, mentionedUserIds: string[], files: File[]) => {
    setIsSending(true)
    try {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))

      await sendMessageWithAttachmentsAction(
        conversation.id,
        content,
        formData,
        mentionedUserIds.length > 0 ? mentionedUserIds : undefined
      )

      // Real-time subscription will handle the refetch
    } finally {
      setIsSending(false)
    }
  }

  const handleEdit = async (messageId: string, content: string) => {
    await editMessageAction(messageId, content)
    await refetch()
  }

  const handleDelete = async (messageId: string) => {
    await deleteMessageAction(messageId)
    await refetch()
  }

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    await toggleReactionAction(messageId, emoji)
    await refetch()
  }

  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const url = await getAttachmentSignedUrlAction(filePath)
      // Open in new tab or trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download attachment:', error)
    }
  }

  const getWelcomeMessage = (type: ConversationType) => {
    switch (type) {
      case 'project':
        return 'Messages here are visible to everyone on this project.'
      case 'workspace':
        return 'Only the internal team and assigned developer can see messages here.'
      case 'partner':
        return 'Only the internal team and DFY partner can see messages here.'
      case 'direct':
        return 'This is a private conversation.'
      case 'inquiry':
        return 'Discuss this inquiry with relevant team members.'
      default:
        return 'Start the conversation.'
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Visibility indicator */}
      <div className="px-4 py-2 text-xs text-muted-foreground border-b bg-muted/30">
        {CONVERSATION_TYPE_LABELS[conversation.type] || conversation.type} &middot; {CONVERSATION_TYPE_DESCRIPTIONS[conversation.type]}
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">{getWelcomeMessage(conversation.type)}</p>
        </div>
      ) : (
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleReaction={handleToggleReaction}
          onDownloadAttachment={handleDownloadAttachment}
          className="flex-1 min-h-0"
        />
      )}

      <MessageInput
        onSend={handleSend}
        participants={participants}
        disabled={isSending}
        placeholder="Type a message..."
      />
    </div>
  )
}

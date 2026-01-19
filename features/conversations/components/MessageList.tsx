'use client'

import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/api/conversations.shared'
import { MessageItem } from './MessageItem'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  onEdit?: (messageId: string, content: string) => Promise<void>
  onDelete?: (messageId: string) => Promise<void>
  onToggleReaction?: (messageId: string, emoji: string) => Promise<void>
  onDownloadAttachment?: (filePath: string, fileName: string) => Promise<void>
  className?: string
}

export function MessageList({
  messages,
  currentUserId,
  onEdit,
  onDelete,
  onToggleReaction,
  onDownloadAttachment,
  className,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastMessageId = useRef<string | null>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const latestId = messages[messages.length - 1].id
      if (latestId !== lastMessageId.current) {
        lastMessageId.current = latestId
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className={cn('flex flex-1 items-center justify-center text-muted-foreground', className)}>
        <p>No messages yet. Start the conversation!</p>
      </div>
    )
  }

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages)

  return (
    <ScrollArea className={cn('flex-1', className)}>
      <div className="py-4">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="relative my-4 flex items-center px-4">
              <div className="flex-1 border-t" />
              <span className="mx-4 text-xs text-muted-foreground">{group.dateLabel}</span>
              <div className="flex-1 border-t" />
            </div>

            {/* Messages for this date */}
            {group.messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                isOwnMessage={message.sender_id === currentUserId}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleReaction={onToggleReaction}
                onDownloadAttachment={onDownloadAttachment}
              />
            ))}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  )
}

interface MessageGroup {
  date: string
  dateLabel: string
  messages: Message[]
}

function groupMessagesByDate(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  let currentDate: string | null = null

  for (const message of messages) {
    const messageDate = new Date(message.created_at).toDateString()

    if (messageDate !== currentDate) {
      currentDate = messageDate
      groups.push({
        date: messageDate,
        dateLabel: formatDateLabel(new Date(message.created_at)),
        messages: [],
      })
    }

    groups[groups.length - 1].messages.push(message)
  }

  return groups
}

function formatDateLabel(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

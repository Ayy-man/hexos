'use client'

import { useState, memo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Pencil, Trash2, Download } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/api/conversations.shared'
import { MessageReactions, AddReactionButton } from './MessageReactions'

interface MessageItemProps {
  message: Message
  currentUserId: string
  isOwnMessage: boolean
  onEdit?: (messageId: string, content: string) => Promise<void>
  onDelete?: (messageId: string) => Promise<void>
  onToggleReaction?: (messageId: string, emoji: string) => Promise<void>
  onDownloadAttachment?: (filePath: string, fileName: string) => Promise<void>
}

export const MessageItem = memo(function MessageItem({
  message,
  currentUserId,
  isOwnMessage,
  onEdit,
  onDelete,
  onToggleReaction,
  onDownloadAttachment,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !onEdit) return
    setIsSubmitting(true)
    try {
      await onEdit(message.id, editContent.trim())
      setIsEditing(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    await onDelete(message.id)
  }

  const handleReaction = async (emoji: string) => {
    if (!onToggleReaction) return
    await onToggleReaction(message.id, emoji)
  }

  const initials = message.sender?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true })

  // Parse content for @mentions (simple approach - look for @name patterns)
  const renderContent = (content: string) => {
    if (!message.mentions?.length) return content

    let result = content
    message.mentions.forEach((mention) => {
      if (mention.mentioned_user) {
        const pattern = new RegExp(`@${mention.mentioned_user.name}`, 'gi')
        result = result.replace(
          pattern,
          `<span class="text-primary font-medium">@${mention.mentioned_user.name}</span>`
        )
      }
    })

    return <span dangerouslySetInnerHTML={{ __html: result }} />
  }

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-2 hover:bg-muted/50',
        isOwnMessage && 'bg-muted/30'
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">{message.sender?.name || 'Unknown'}</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {message.edited_at && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[60px] resize-none"
              disabled={isSubmitting}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSubmitting || !editContent.trim()}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </p>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2"
              >
                <span className="text-sm truncate max-w-[200px]">
                  {attachment.file_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)}
                </span>
                {onDownloadAttachment && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() =>
                      onDownloadAttachment(attachment.file_path, attachment.file_name)
                    }
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {(message.reactions?.length || 0) > 0 && (
          <MessageReactions
            reactions={message.reactions || []}
            currentUserId={currentUserId}
            onToggleReaction={handleReaction}
            className="mt-2"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <AddReactionButton onAddReaction={handleReaction} />

        {isOwnMessage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
})

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

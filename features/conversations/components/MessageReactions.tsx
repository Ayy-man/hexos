'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
} from '@/components/ui/emoji-picker'
import { cn } from '@/lib/utils'
import type { MessageReaction } from '@/lib/api/conversations.shared'

interface MessageReactionsProps {
  reactions: MessageReaction[]
  currentUserId: string
  onToggleReaction: (emoji: string) => Promise<void>
  className?: string
}

// Common quick reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

export function MessageReactions({
  reactions,
  currentUserId,
  onToggleReaction,
  className,
}: MessageReactionsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState<string | null>(null)

  // Group reactions by emoji
  const groupedReactions = reactions.reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          userReacted: false,
          users: [],
        }
      }
      acc[reaction.emoji].count++
      acc[reaction.emoji].users.push(reaction.user?.name || 'Unknown')
      if (reaction.user_id === currentUserId) {
        acc[reaction.emoji].userReacted = true
      }
      return acc
    },
    {} as Record<string, { emoji: string; count: number; userReacted: boolean; users: string[] }>
  )

  const handleReaction = async (emoji: string) => {
    setIsLoading(emoji)
    try {
      await onToggleReaction(emoji)
    } finally {
      setIsLoading(null)
      setIsPickerOpen(false)
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {Object.values(groupedReactions).map(({ emoji, count, userReacted, users }) => (
        <button
          key={emoji}
          onClick={() => handleReaction(emoji)}
          disabled={isLoading === emoji}
          title={users.join(', ')}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-muted',
            userReacted && 'border-primary bg-primary/10',
            isLoading === emoji && 'opacity-50'
          )}
        >
          <span>{emoji}</span>
          <span className="text-muted-foreground">{count}</span>
        </button>
      ))}

      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:text-foreground"
          >
            <span className="text-sm">+</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {/* Quick reactions */}
          <div className="flex gap-1 border-b p-2">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="rounded p-1 text-lg hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
          {/* Full emoji picker */}
          <div className="h-64">
            <EmojiPicker
              onEmojiSelect={({ emoji }: { emoji: string }) => handleReaction(emoji)}
            >
              <EmojiPickerSearch placeholder="Search emoji..." />
              <EmojiPickerContent />
            </EmojiPicker>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface AddReactionButtonProps {
  onAddReaction: (emoji: string) => Promise<void>
}

export function AddReactionButton({ onAddReaction }: AddReactionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = async (emoji: string) => {
    setIsOpen(false)
    await onAddReaction(emoji)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
          <span className="text-base">😀</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex gap-1 border-b p-2">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className="rounded p-1 text-lg hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="h-64">
          <EmojiPicker
            onEmojiSelect={({ emoji }: { emoji: string }) => handleSelect(emoji)}
          >
            <EmojiPickerSearch placeholder="Search emoji..." />
            <EmojiPickerContent />
          </EmojiPicker>
        </div>
      </PopoverContent>
    </Popover>
  )
}

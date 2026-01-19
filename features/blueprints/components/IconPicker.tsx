'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
} from '@/components/ui/emoji-picker'

interface IconPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-14 w-14 text-2xl hover:bg-muted"
        >
          {value || '🤖'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[352px] p-0" align="start">
        <EmojiPicker
          className="h-[400px]"
          onEmojiSelect={(emoji) => {
            onChange(emoji.emoji)
            setOpen(false)
          }}
        >
          <EmojiPickerSearch placeholder="Search emoji..." />
          <EmojiPickerContent />
          <EmojiPickerFooter />
        </EmojiPicker>
      </PopoverContent>
    </Popover>
  )
}

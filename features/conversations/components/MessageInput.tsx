'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Paperclip, X, AtSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Participant {
  id: string
  name: string
  email: string
}

interface MessageInputProps {
  onSend: (content: string, mentionedUserIds: string[], files: File[]) => Promise<void>
  participants?: Participant[]
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function MessageInput({
  onSend,
  participants = [],
  disabled = false,
  placeholder = 'Type a message...',
  className,
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionedUserIds, setMentionedUserIds] = useState<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filter participants for mention suggestions
  const filteredParticipants = participants.filter((p) =>
    p.name.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  const handleSubmit = async () => {
    if ((!content.trim() && files.length === 0) || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSend(content.trim(), Array.from(mentionedUserIds), files)
      setContent('')
      setFiles([])
      setMentionedUserIds(new Set())
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
      return
    }

    // Close mentions on Escape
    if (e.key === 'Escape' && showMentions) {
      setShowMentions(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)

    // Check for @ mention trigger
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)

    if (atMatch) {
      setMentionQuery(atMatch[1])
      setShowMentions(true)
    } else {
      setShowMentions(false)
      setMentionQuery('')
    }
  }

  const insertMention = (participant: Participant) => {
    if (!textareaRef.current) return

    const cursorPos = textareaRef.current.selectionStart
    const textBeforeCursor = content.slice(0, cursorPos)
    const textAfterCursor = content.slice(cursorPos)

    // Replace @query with @name
    const atIndex = textBeforeCursor.lastIndexOf('@')
    const newTextBefore = textBeforeCursor.slice(0, atIndex) + `@${participant.name} `
    const newContent = newTextBefore + textAfterCursor

    setContent(newContent)
    setMentionedUserIds((prev) => new Set(prev).add(participant.id))
    setShowMentions(false)
    setMentionQuery('')

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newTextBefore.length, newTextBefore.length)
    }, 0)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...newFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className={cn('border-t bg-background p-4', className)}>
      {/* File previews */}
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1"
            >
              <span className="text-sm truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Mention button */}
        <Popover open={showMentions} onOpenChange={setShowMentions}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              disabled={disabled || participants.length === 0}
            >
              <AtSign className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start" side="top">
            <div className="max-h-48 overflow-y-auto">
              {filteredParticipants.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No participants found</div>
              ) : (
                filteredParticipants.map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => insertMention(participant)}
                    className="w-full px-3 py-2 text-left hover:bg-muted"
                  >
                    <div className="text-sm font-medium">{participant.name}</div>
                    <div className="text-xs text-muted-foreground">{participant.email}</div>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Text input */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          className="min-h-[40px] max-h-[200px] flex-1 resize-none"
          rows={1}
        />

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          onClick={handleSubmit}
          disabled={disabled || isSubmitting || (!content.trim() && files.length === 0)}
          className="shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

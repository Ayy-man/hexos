'use client'

import React, { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus, Loader2 } from 'lucide-react'
import type { QuestionType } from '@/lib/api/onboarding-questions'

interface InlineQuestionRowProps {
  onSave: (data: { title: string; question_type: QuestionType }) => Promise<void>
  onCancel: () => void
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  select: 'Single select',
  multi_select: 'Multi select',
  boolean: 'Yes / No',
}

export function InlineQuestionRow({ onSave, onCancel }: InlineQuestionRowProps) {
  const [title, setTitle] = useState('')
  const [questionType, setQuestionType] = useState<QuestionType>('text')
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    if (!title.trim() || isSaving) return
    setIsSaving(true)
    try {
      await onSave({ title: title.trim(), question_type: questionType })
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onCancel()
    }
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex items-center gap-2 py-2 px-2 rounded-lg bg-muted/30 border border-dashed">
      <Select
        value={questionType}
        onValueChange={(val: string) => setQuestionType(val as QuestionType)}
      >
        <SelectTrigger className="h-8 w-36 shrink-0 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(
            ([type, label]) => (
              <SelectItem key={type} value={type} className="text-xs">
                {label}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>

      <Input
        ref={inputRef}
        value={title}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Question title..."
        disabled={isSaving}
        className="h-8 text-sm flex-1"
      />

      <Button
        variant="default"
        size="sm"
        className="h-8 shrink-0 text-xs px-3"
        onClick={handleSubmit}
        disabled={!title.trim() || isSaving}
        type="button"
      >
        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
        {isSaving ? 'Adding...' : 'Add'}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onCancel}
        type="button"
        tabIndex={-1}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

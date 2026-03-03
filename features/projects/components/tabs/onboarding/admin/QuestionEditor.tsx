'use client'

import React, { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SortableItemHandle } from '@/components/ui/sortable'
import { GripVertical, Trash2, ChevronUp, ChevronDown, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { OnboardingQuestion, QuestionType, UpdateOnboardingQuestionInput } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'

interface QuestionEditorProps {
  question: OnboardingQuestion
  projectId: string
  answer?: OnboardingAnswer
  onUpdate: (questionId: string, input: UpdateOnboardingQuestionInput) => Promise<void>
  onDelete: (questionId: string) => Promise<void>
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  select: 'Single select',
  multi_select: 'Multi select',
  boolean: 'Yes / No',
}

export function QuestionEditor({
  question,
  projectId: _projectId,
  answer,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: QuestionEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(question.title)
  const [options, setOptions] = useState<string[]>(question.options ?? [])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const hasOptions =
    question.question_type === 'select' || question.question_type === 'multi_select'

  const handleTitleBlur = () => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== question.title) {
      startTransition(async () => {
        try {
          await onUpdate(question.id, { title: trimmed })
        } catch {
          toast.error('Failed to update question title')
          setTitle(question.title)
        }
      })
    }
  }

  const handleTypeChange = (newType: QuestionType) => {
    startTransition(async () => {
      try {
        await onUpdate(question.id, { question_type: newType })
      } catch {
        toast.error('Failed to update question type')
      }
    })
  }

  const handleRequiredToggle = (checked: boolean) => {
    startTransition(async () => {
      try {
        await onUpdate(question.id, { is_required: checked })
      } catch {
        toast.error('Failed to update required setting')
      }
    })
  }

  const handleOptionBlur = (index: number, value: string) => {
    const trimmed = value.trim()
    const newOptions = [...options]
    if (!trimmed) {
      newOptions.splice(index, 1)
    } else {
      newOptions[index] = trimmed
    }
    setOptions(newOptions)
    startTransition(async () => {
      try {
        await onUpdate(question.id, { options: newOptions })
      } catch {
        toast.error('Failed to update options')
      }
    })
  }

  const handleAddOption = () => {
    setOptions([...options, ''])
  }

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_: string, i: number) => i !== index)
    setOptions(newOptions)
    startTransition(async () => {
      try {
        await onUpdate(question.id, { options: newOptions })
      } catch {
        toast.error('Failed to remove option')
      }
    })
  }

  const handleDeleteConfirm = () => {
    startTransition(async () => {
      try {
        await onDelete(question.id)
      } catch {
        toast.error('Failed to delete question')
        setShowDeleteConfirm(false)
      }
    })
  }

  const getAnswerPreview = (): string | null => {
    if (!answer?.value) return null
    if (Array.isArray(answer.value)) return answer.value.join(', ')
    if (typeof answer.value === 'boolean') return answer.value ? 'Yes' : 'No'
    return String(answer.value)
  }

  const answerPreview = getAnswerPreview()

  return (
    <div className={`space-y-2 py-3 px-2 rounded-lg border bg-background ${isPending ? 'opacity-60' : ''}`}>
      {/* Row 1: Handle + Type + Title + Required + Up/Down + Delete */}
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <SortableItemHandle className="text-muted-foreground hover:text-foreground shrink-0">
          <GripVertical className="h-4 w-4" />
        </SortableItemHandle>

        {/* Type picker */}
        <Select
          value={question.question_type}
          onValueChange={(v: string) => handleTypeChange(v as QuestionType)}
          disabled={isPending}
        >
          <SelectTrigger className="h-7 w-32 shrink-0 text-xs">
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

        {/* Title input */}
        <Input
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          disabled={isPending}
          className="h-7 text-sm flex-1"
          placeholder="Question title"
        />

        {/* Required toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Switch
            id={`required-${question.id}`}
            checked={question.is_required}
            onCheckedChange={handleRequiredToggle}
            disabled={isPending}
            className="h-4 w-7"
          />
          <Label
            htmlFor={`required-${question.id}`}
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            Required
          </Label>
        </div>

        {/* Accessible reorder buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onMoveUp}
            disabled={isFirst || isPending}
            title="Move up"
            type="button"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onMoveDown}
            disabled={isLast || isPending}
            title="Move down"
            type="button"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Delete button or confirmation */}
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-destructive">Delete?</span>
            <Button
              variant="destructive"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleDeleteConfirm}
              disabled={isPending}
              type="button"
            >
              Yes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setShowDeleteConfirm(false)}
              type="button"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPending}
            title="Delete question"
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Options editor (for select/multi_select) */}
      {hasOptions && (
        <div className="pl-8 space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Options</p>
          {options.map((opt: string, idx: number) => (
            <div key={idx} className="flex items-center gap-1.5">
              <Input
                defaultValue={opt}
                onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleOptionBlur(idx, e.target.value)}
                className="h-6 text-xs flex-1"
                placeholder={`Option ${idx + 1}`}
                disabled={isPending}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => handleRemoveOption(idx)}
                disabled={isPending}
                type="button"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground"
            onClick={handleAddOption}
            disabled={isPending}
            type="button"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add option
          </Button>
        </div>
      )}

      {/* DFY answer preview */}
      {answerPreview && (
        <div className="pl-8">
          <p className="text-xs text-muted-foreground italic">
            DFY answered: <span className="text-foreground/60">{answerPreview}</span>
          </p>
        </div>
      )}
    </div>
  )
}

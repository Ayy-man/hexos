'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Sortable, SortableItem } from '@/components/ui/sortable'
import { toast } from 'sonner'
import { QuestionEditor } from './QuestionEditor'
import { InlineQuestionRow } from './InlineQuestionRow'
import {
  addQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  reorderQuestionsAction,
} from '@/features/projects/actions/onboardingFormActions'
import type { OnboardingQuestion, UpdateOnboardingQuestionInput } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'

interface SortableQuestionItem {
  id: string
}

interface CategoryEditorProps {
  projectId: string
  categoryId: string
  questions: OnboardingQuestion[]
  answers: OnboardingAnswer[]
}

export function CategoryEditor({
  projectId,
  categoryId,
  questions,
  answers,
}: CategoryEditorProps) {
  const [sortedQuestions, setSortedQuestions] = useState<OnboardingQuestion[]>(
    [...questions].sort((a, b) => a.position - b.position)
  )
  const [showNewRow, setShowNewRow] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleReorder = (newItems: SortableQuestionItem[]) => {
    // Optimistically reorder locally
    const reordered = newItems
      .map((item: SortableQuestionItem) => sortedQuestions.find((q: OnboardingQuestion) => q.id === item.id))
      .filter((q): q is OnboardingQuestion => q !== undefined)
    setSortedQuestions(reordered)

    const updates = newItems.map((item: SortableQuestionItem, index: number) => ({
      id: item.id,
      position: index,
    }))

    startTransition(async () => {
      const result = await reorderQuestionsAction(projectId, updates)
      if (!result.success) {
        toast.error(result.error || 'Failed to reorder questions')
        // Restore original order on failure
        setSortedQuestions([...questions].sort((a: OnboardingQuestion, b: OnboardingQuestion) => a.position - b.position))
      }
    })
  }

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sortedQuestions.length) return

    const reordered = [...sortedQuestions]
    const temp = reordered[index]
    reordered[index] = reordered[newIndex]
    reordered[newIndex] = temp
    setSortedQuestions(reordered)

    const updates = reordered.map((q: OnboardingQuestion, i: number) => ({ id: q.id, position: i }))
    startTransition(async () => {
      const result = await reorderQuestionsAction(projectId, updates)
      if (!result.success) {
        toast.error(result.error || 'Failed to reorder questions')
        setSortedQuestions([...questions].sort((a: OnboardingQuestion, b: OnboardingQuestion) => a.position - b.position))
      }
    })
  }

  const handleAddQuestion = async (data: {
    title: string
    question_type: OnboardingQuestion['question_type']
  }) => {
    const result = await addQuestionAction(projectId, categoryId, data)
    if (!result.success) {
      toast.error(result.error || 'Failed to add question')
    } else {
      // Optimistically add to local state — no page reload needed
      if (result.question) {
        setSortedQuestions((prev: OnboardingQuestion[]) => [...prev, result.question!])
      }
      toast.success('Question added')
      setShowNewRow(false)
    }
  }

  const handleQuestionUpdate = async (
    questionId: string,
    input: UpdateOnboardingQuestionInput
  ) => {
    const result = await updateQuestionAction(questionId, input)
    if (!result.success) {
      throw new Error(result.error || 'Failed to update question')
    }
    // Optimistically update local state for type/required changes
    if (input.question_type !== undefined || input.is_required !== undefined) {
      setSortedQuestions((prev: OnboardingQuestion[]) =>
        prev.map((q: OnboardingQuestion) =>
          q.id === questionId ? { ...q, ...input } : q
        )
      )
    }
  }

  const handleQuestionDelete = async (questionId: string) => {
    const result = await deleteQuestionAction(questionId, projectId)
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete question')
    }
    setSortedQuestions((prev: OnboardingQuestion[]) => prev.filter((q: OnboardingQuestion) => q.id !== questionId))
    toast.success('Question deleted')
  }

  const getAnswerForQuestion = (questionId: string): OnboardingAnswer | undefined =>
    answers.find((a: OnboardingAnswer) => a.question_id === questionId)

  const sortableItems: SortableQuestionItem[] = sortedQuestions.map((q: OnboardingQuestion) => ({ id: q.id }))

  return (
    <div className="space-y-4">
      {sortedQuestions.length === 0 && !showNewRow && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No questions yet. Add your first question below.
        </p>
      )}

      {sortedQuestions.length > 0 && (
        <Sortable
          value={sortableItems}
          onValueChange={handleReorder}
          getItemValue={(item: SortableQuestionItem) => item.id}
          className="space-y-2"
        >
          {sortedQuestions.map((q: OnboardingQuestion, index: number) => (
            <SortableItem key={q.id} value={q.id} className="space-y-0">
              <QuestionEditor
                question={q}
                projectId={projectId}
                answer={getAnswerForQuestion(q.id)}
                onUpdate={handleQuestionUpdate}
                onDelete={handleQuestionDelete}
                onMoveUp={() => moveQuestion(index, -1)}
                onMoveDown={() => moveQuestion(index, 1)}
                isFirst={index === 0}
                isLast={index === sortedQuestions.length - 1}
              />
            </SortableItem>
          ))}
        </Sortable>
      )}

      {/* Inline question creation */}
      {showNewRow ? (
        <InlineQuestionRow
          onSave={handleAddQuestion}
          onCancel={() => setShowNewRow(false)}
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full border border-dashed text-muted-foreground hover:text-foreground"
          onClick={() => setShowNewRow(true)}
          disabled={isPending}
          type="button"
        >
          + Add Question
        </Button>
      )}
    </div>
  )
}

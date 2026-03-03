'use client'

import { useCallback, useImperativeHandle, forwardRef, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { QuestionField } from './QuestionField'
import { AutoSaveStatus } from './AutoSaveStatus'
import { useCategoryAutosave } from '../hooks/use-category-autosave'
import { saveAnswerAction } from '@/features/projects/actions/onboardingFormActions'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'

export interface CategoryFormHandle {
  saveOnClose: () => Promise<void>
  hasDirtyFields: boolean
}

interface CategoryFormProps {
  projectId: string
  questions: OnboardingQuestion[]
  answers: OnboardingAnswer[]
  readOnly?: boolean
  onSectionDeleted?: () => void
}

export const CategoryForm = forwardRef<CategoryFormHandle, CategoryFormProps>(
  function CategoryForm({ projectId, questions, answers, readOnly = false, onSectionDeleted }, ref) {
    // Build default values from existing answers
    const defaultValues = questions.reduce(
      (acc, q) => {
        const answer = answers.find((a) => a.question_id === q.id)
        acc[q.id] =
          answer?.value ??
          (q.question_type === 'boolean'
            ? false
            : q.question_type === 'multi_select'
              ? []
              : '')
        return acc
      },
      {} as Record<string, any>,
    )

    const form = useForm<Record<string, any>>({ defaultValues })

    const handleSave = useCallback(
      async (questionId: string, value: any) => {
        return saveAnswerAction(projectId, questionId, value)
      },
      [projectId],
    )

    const {
      saveStatus,
      saveError,
      debouncedOnChange,
      handleBlur,
      saveOnClose,
      hasDirtyFields,
      retrySave,
    } = useCategoryAutosave(form, handleSave)

    // Watch for section_deleted error to trigger auto-close
    useEffect(() => {
      if (
        saveStatus === 'error' &&
        saveError?.includes('section was removed') &&
        onSectionDeleted
      ) {
        const timer = setTimeout(() => {
          onSectionDeleted()
        }, 2000)
        return () => clearTimeout(timer)
      }
    }, [saveStatus, saveError, onSectionDeleted])

    // Expose saveOnClose and hasDirtyFields via ref
    useImperativeHandle(
      ref,
      () => ({
        saveOnClose,
        hasDirtyFields,
      }),
      [saveOnClose, hasDirtyFields],
    )

    return (
      <FormProvider {...form}>
        <div className="space-y-6">
          <AutoSaveStatus status={saveStatus} error={saveError} onRetry={retrySave} />
          {questions
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                control={form.control}
                onBlur={handleBlur}
                onChange={debouncedOnChange}
                readOnly={readOnly}
              />
            ))}
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No questions in this category yet.
            </p>
          )}
        </div>
      </FormProvider>
    )
  },
)

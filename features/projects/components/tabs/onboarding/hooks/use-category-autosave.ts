'use client'

import { useCallback, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useDebouncedCallback } from '@/hooks/use-debounce'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useCategoryAutosave(
  form: UseFormReturn<Record<string, any>>,
  onSave: (questionId: string, value: any) => Promise<{ success: boolean; error?: string }>,
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const pendingSavesRef = useRef<Set<string>>(new Set())

  const performSave = useCallback(async (questionId: string) => {
    // CRITICAL: Read values INSIDE callback, not in closure
    const value = form.getValues(questionId)
    if (pendingSavesRef.current.has(questionId)) return // already saving this field

    pendingSavesRef.current.add(questionId)
    setSaveStatus('saving')
    setSaveError(null)

    try {
      const result = await onSave(questionId, value)
      if (result.success) {
        // Reset dirty state for this field after successful save
        form.resetField(questionId, { defaultValue: value, keepDirty: false })
        setSaveStatus('saved')
      } else {
        setSaveStatus('error')
        setSaveError(
          result.error === 'section_deleted'
            ? 'This section was removed by your team. Your changes could not be saved.'
            : result.error || 'Failed to save',
        )
      }
    } catch {
      setSaveStatus('error')
      setSaveError('Failed to save')
    } finally {
      pendingSavesRef.current.delete(questionId)
    }
  }, [form, onSave])

  // Layer 1: onChange debounce (2500ms) — handles "user never blurs"
  const debouncedOnChange = useDebouncedCallback((questionId: string) => {
    if (form.formState.dirtyFields[questionId]) {
      performSave(questionId)
    }
  }, 2500)

  // Layer 2: onBlur for each field
  const handleBlur = useCallback((questionId: string) => {
    if (form.formState.dirtyFields[questionId]) {
      performSave(questionId)
    }
  }, [form, performSave])

  // Layer 3: save-on-close — save ALL dirty fields
  const saveOnClose = useCallback(async () => {
    const dirtyFields = form.formState.dirtyFields
    const dirtyKeys = Object.keys(dirtyFields).filter(k => dirtyFields[k])
    if (dirtyKeys.length === 0) return

    setSaveStatus('saving')
    for (const questionId of dirtyKeys) {
      await performSave(questionId)
    }
  }, [form, performSave])

  const hasDirtyFields = Object.keys(form.formState.dirtyFields).some(
    k => form.formState.dirtyFields[k],
  )

  const retrySave = useCallback(() => {
    // Retry all dirty fields
    const dirtyKeys = Object.keys(form.formState.dirtyFields).filter(
      k => form.formState.dirtyFields[k],
    )
    for (const questionId of dirtyKeys) {
      performSave(questionId)
    }
  }, [form, performSave])

  return {
    saveStatus,
    saveError,
    debouncedOnChange,
    handleBlur,
    saveOnClose,
    hasDirtyFields,
    retrySave,
  }
}

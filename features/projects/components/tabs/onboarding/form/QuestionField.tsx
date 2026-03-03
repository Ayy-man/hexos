'use client'

import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import type { Control } from 'react-hook-form'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'

interface QuestionFieldProps {
  question: OnboardingQuestion
  control: Control<Record<string, any>>
  onBlur: (questionId: string) => void
  onChange: (questionId: string) => void
  readOnly?: boolean
}

export function QuestionField({
  question,
  control,
  onBlur,
  onChange,
  readOnly = false,
}: QuestionFieldProps) {
  const fieldId = `question-${question.id}`
  const descId = `question-${question.id}-desc`

  return (
    <FormField
      control={control}
      name={question.id}
      render={({ field }) => (
        <FormItem>
          <FormLabel htmlFor={fieldId}>
            {question.title}
            {question.is_required && (
              <span className="text-[--signal-warn] ml-1" aria-hidden="true">
                *
              </span>
            )}
          </FormLabel>

          {question.description && (
            <p id={descId} className="text-sm text-muted-foreground">
              {question.description}
            </p>
          )}

          <FormControl>
            <>
              {question.question_type === 'text' && (
                <Input
                  id={fieldId}
                  value={field.value ?? ''}
                  disabled={readOnly}
                  aria-describedby={question.description ? descId : undefined}
                  onChange={(e) => {
                    field.onChange(e)
                    if (!readOnly) onChange(question.id)
                  }}
                  onBlur={() => {
                    field.onBlur()
                    if (!readOnly) onBlur(question.id)
                  }}
                />
              )}

              {question.question_type === 'textarea' && (
                <Textarea
                  id={fieldId}
                  value={field.value ?? ''}
                  rows={4}
                  disabled={readOnly}
                  aria-describedby={question.description ? descId : undefined}
                  onChange={(e) => {
                    field.onChange(e)
                    if (!readOnly) onChange(question.id)
                  }}
                  onBlur={() => {
                    field.onBlur()
                    if (!readOnly) onBlur(question.id)
                  }}
                />
              )}

              {question.question_type === 'select' && (
                <Select
                  value={field.value ?? ''}
                  disabled={readOnly}
                  onValueChange={(val) => {
                    field.onChange(val)
                    if (!readOnly) {
                      onChange(question.id)
                      // Treat selection as blur (value committed immediately)
                      onBlur(question.id)
                    }
                  }}
                >
                  <SelectTrigger
                    id={fieldId}
                    aria-describedby={question.description ? descId : undefined}
                  >
                    <SelectValue placeholder="Select an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(question.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {question.question_type === 'multi_select' && (
                <fieldset
                  aria-describedby={question.description ? descId : undefined}
                  className="space-y-2"
                >
                  <legend className="sr-only">{question.title}</legend>
                  {(question.options ?? []).map((option) => {
                    const currentValues: string[] = Array.isArray(field.value)
                      ? field.value
                      : []
                    const isChecked = currentValues.includes(option)
                    const checkboxId = `${fieldId}-${option}`

                    return (
                      <div key={option} className="flex items-center gap-2">
                        <Checkbox
                          id={checkboxId}
                          checked={isChecked}
                          disabled={readOnly}
                          onCheckedChange={(checked) => {
                            const newValues = checked
                              ? [...currentValues, option]
                              : currentValues.filter((v) => v !== option)
                            field.onChange(newValues)
                            if (!readOnly) onChange(question.id)
                          }}
                        />
                        <label
                          htmlFor={checkboxId}
                          className="text-sm leading-none cursor-pointer"
                        >
                          {option}
                        </label>
                      </div>
                    )
                  })}
                </fieldset>
              )}

              {question.question_type === 'boolean' && (
                <div className="flex items-center gap-2">
                  <Switch
                    id={fieldId}
                    checked={field.value ?? false}
                    disabled={readOnly}
                    aria-describedby={question.description ? descId : undefined}
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                      if (!readOnly) {
                        // For boolean, save immediately on toggle (no need to wait for blur)
                        onChange(question.id)
                        onBlur(question.id)
                      }
                    }}
                  />
                </div>
              )}
            </>
          </FormControl>
        </FormItem>
      )}
    />
  )
}

'use client'

import { cn } from '@/lib/utils'
import type { FormPath } from '../schemas/intakeFormSchema'

interface FormStepIndicatorProps {
  currentStep: string
  submissionType?: 'closed' | 'proposal'
  currentPath: FormPath | null
}

export function FormStepIndicator({ currentStep, submissionType, currentPath }: FormStepIndicatorProps) {
  // Define steps based on submission type
  const getSteps = () => {
    const baseSteps = [{ id: 'initial', label: 'Start' }]

    if (submissionType === 'closed') {
      return [
        ...baseSteps,
        { id: 'closed_type', label: 'Deal Type' },
        { id: 'path_form', label: 'Details' },
        { id: 'forward', label: 'Forward' },
      ]
    }

    if (submissionType === 'proposal') {
      if (currentPath === 'B1') {
        return [
          ...baseSteps,
          { id: 'proposal_type', label: 'Info' },
        ]
      }
      return [
        ...baseSteps,
        { id: 'proposal_type', label: 'Type' },
        { id: 'path_form', label: 'Details' },
        { id: 'forward', label: 'Forward' },
      ]
    }

    return baseSteps
  }

  const steps = getSteps()
  const currentIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center gap-2 pt-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={cn(
              'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
              index < currentIndex
                ? 'bg-cyan-600 text-white'
                : index === currentIndex
                  ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300 ring-2 ring-cyan-600'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {index + 1}
          </div>
          <span
            className={cn(
              'ml-2 text-sm hidden sm:inline',
              index === currentIndex ? 'font-medium' : 'text-muted-foreground'
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-8 h-0.5 mx-2',
                index < currentIndex ? 'bg-cyan-600' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

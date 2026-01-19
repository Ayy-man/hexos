'use client'

import { useFormContext } from 'react-hook-form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface InitialStepProps {
  onNext?: () => void
}

export function InitialStep({ onNext }: InitialStepProps) {
  const { watch, setValue } = useFormContext()
  const submissionType = watch('submission_type')

  const handleSelect = (value: string) => {
    setValue('submission_type', value)
    // Auto-advance after a brief delay to show the selection
    if (onNext) {
      setTimeout(() => onNext(), 150)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">What are you here for?</h2>
        <RadioGroup
          value={submissionType || ""}
          onValueChange={handleSelect}
          className="space-y-3"
        >
          <label
            htmlFor="closed"
            className="flex items-start space-x-4 p-5 rounded-xl border-2 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value="closed" id="closed" className="mt-1" />
            <div className="flex-1">
              <span className="text-base font-medium block">I have closed a deal</span>
              <span className="text-sm text-muted-foreground mt-1 block">
                Contract signed / cash collected
              </span>
            </div>
          </label>
          <label
            htmlFor="proposal"
            className="flex items-start space-x-4 p-5 rounded-xl border-2 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value="proposal" id="proposal" className="mt-1" />
            <div className="flex-1">
              <span className="text-base font-medium block">I&apos;m requesting a proposal</span>
              <span className="text-sm text-muted-foreground mt-1 block">
                Need a proposal to be made for a prospect
              </span>
            </div>
          </label>
        </RadioGroup>
      </div>
    </div>
  )
}

'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export function InitialStep() {
  const { watch, setValue } = useFormContext()
  const submissionType = watch('submission_type')

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">What are you here for?</h2>
        <RadioGroup
          value={submissionType || ""}
          onValueChange={(value) => setValue('submission_type', value)}
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

'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export function InitialStep() {
  const { register, watch, setValue } = useFormContext()
  const submissionType = watch('submission_type')

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-medium">What are you here for?</Label>
        <RadioGroup
          value={submissionType}
          onValueChange={(value) => setValue('submission_type', value)}
          className="space-y-3"
        >
          <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="closed" id="closed" className="mt-0.5" />
            <Label htmlFor="closed" className="cursor-pointer flex-1">
              <div className="font-medium">I have closed a deal</div>
              <div className="text-sm text-muted-foreground">
                Contract signed / cash collected
              </div>
            </Label>
          </div>
          <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="proposal" id="proposal" className="mt-0.5" />
            <Label htmlFor="proposal" className="cursor-pointer flex-1">
              <div className="font-medium">I&apos;m requesting a proposal</div>
              <div className="text-sm text-muted-foreground">
                Need a proposal to be made for a prospect
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="partner_name">What&apos;s your name (Arbitrage Partner)?</Label>
        <Input
          id="partner_name"
          placeholder="Your name"
          {...register('partner_name')}
        />
      </div>
    </div>
  )
}

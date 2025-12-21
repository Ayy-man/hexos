'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export function ProposalType() {
  const { watch, setValue } = useFormContext()
  const proposalType = watch('proposal_type')

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-medium">What type of proposal do you need?</Label>
        <RadioGroup
          value={proposalType}
          onValueChange={(value) => setValue('proposal_type', value)}
          className="space-y-3"
        >
          <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="blueprint" id="blueprint" className="mt-0.5" />
            <Label htmlFor="blueprint" className="cursor-pointer flex-1">
              <div className="font-medium">Standard Hexona Blueprint</div>
              <div className="text-sm text-muted-foreground">
                Use our Blueprint Library documents directly
              </div>
            </Label>
          </div>
          <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="variation" id="variation" className="mt-0.5" />
            <Label htmlFor="variation" className="cursor-pointer flex-1">
              <div className="font-medium">Blueprint + Variation / Add-ons</div>
              <div className="text-sm text-muted-foreground">
                Standard blueprint with some modifications
              </div>
            </Label>
          </div>
          <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="custom" id="custom" className="mt-0.5" />
            <Label htmlFor="custom" className="cursor-pointer flex-1">
              <div className="font-medium">Custom Build Out</div>
              <div className="text-sm text-muted-foreground">
                Something outside our Blueprint Library
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}

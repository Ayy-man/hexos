'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface ProposalTypeProps {
  onNext?: () => void
}

export function ProposalType({ onNext }: ProposalTypeProps) {
  const { watch, setValue } = useFormContext()
  const proposalType = watch('proposal_type')

  const handleSelect = (value: string) => {
    setValue('proposal_type', value)
    // Auto-advance for variation and custom (B2, B3) but NOT for blueprint (B1)
    // B1 shows info page, not the detail form
    if (onNext && value !== 'blueprint') {
      setTimeout(() => onNext(), 150)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-medium">What type of proposal do you need?</Label>
        <RadioGroup
          value={proposalType || ""}
          onValueChange={handleSelect}
          className="space-y-3"
        >
          <label
            htmlFor="proposal-blueprint"
            className="flex items-start space-x-4 p-5 rounded-xl border-2 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value="blueprint" id="proposal-blueprint" className="mt-1" />
            <div className="flex-1">
              <span className="text-base font-medium block">Standard Hexona Blueprint</span>
              <span className="text-sm text-muted-foreground mt-1 block">
                Use our Blueprint Library documents directly
              </span>
            </div>
          </label>
          <label
            htmlFor="proposal-variation"
            className="flex items-start space-x-4 p-5 rounded-xl border-2 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value="variation" id="proposal-variation" className="mt-1" />
            <div className="flex-1">
              <span className="text-base font-medium block">Blueprint + Variation / Add-ons</span>
              <span className="text-sm text-muted-foreground mt-1 block">
                Standard blueprint with some modifications
              </span>
            </div>
          </label>
          <label
            htmlFor="proposal-custom"
            className="flex items-start space-x-4 p-5 rounded-xl border-2 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value="custom" id="proposal-custom" className="mt-1" />
            <div className="flex-1">
              <span className="text-base font-medium block">Custom Build Out</span>
              <span className="text-sm text-muted-foreground mt-1 block">
                Something outside our Blueprint Library
              </span>
            </div>
          </label>
        </RadioGroup>
      </div>
    </div>
  )
}

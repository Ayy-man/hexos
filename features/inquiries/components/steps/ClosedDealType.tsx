'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface ClosedDealTypeProps {
  onNext?: () => void
}

export function ClosedDealType({ onNext }: ClosedDealTypeProps) {
  const { watch, setValue } = useFormContext()
  const dealType = watch('closed_deal_type')

  const handleSelect = (value: string) => {
    setValue('closed_deal_type', value)
    // Auto-advance after a brief delay to show the selection
    if (onNext) {
      setTimeout(() => onNext(), 150)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-medium">What type of deal did you close?</Label>
        <RadioGroup
          value={dealType || ""}
          onValueChange={handleSelect}
          className="space-y-3"
        >
          <label
            htmlFor="blueprint"
            className="flex items-start space-x-4 p-5 rounded-xl border-2 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value="blueprint" id="blueprint" className="mt-1" />
            <div className="flex-1">
              <span className="text-base font-medium block">Standard Hexona Blueprint</span>
              <span className="text-sm text-muted-foreground mt-1 block">
                One of our pre-built automation solutions
              </span>
            </div>
          </label>
          <label
            htmlFor="custom"
            className="flex items-start space-x-4 p-5 rounded-xl border-2 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value="custom" id="custom" className="mt-1" />
            <div className="flex-1">
              <span className="text-base font-medium block">Custom Deal</span>
              <span className="text-sm text-muted-foreground mt-1 block">
                Using a proposal we created for you
              </span>
            </div>
          </label>
          <label
            htmlFor="variation"
            className="flex items-start space-x-4 p-5 rounded-xl border-2 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value="variation" id="variation" className="mt-1" />
            <div className="flex-1">
              <span className="text-base font-medium block">Blueprint + Variation</span>
              <span className="text-sm text-muted-foreground mt-1 block">
                Using a proposal we created with modifications
              </span>
            </div>
          </label>
        </RadioGroup>
      </div>
    </div>
  )
}

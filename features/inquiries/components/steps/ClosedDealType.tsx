'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export function ClosedDealType() {
  const { watch, setValue } = useFormContext()
  const dealType = watch('closed_deal_type')

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-medium">What type of deal did you close?</Label>
        <RadioGroup
          value={dealType || ""}
          onValueChange={(value) => setValue('closed_deal_type', value)}
          className="space-y-3"
        >
          <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="blueprint" id="blueprint" className="mt-0.5" />
            <Label htmlFor="blueprint" className="cursor-pointer flex-1">
              <div className="font-medium">Standard Hexona Blueprint</div>
              <div className="text-sm text-muted-foreground">
                One of our pre-built automation solutions
              </div>
            </Label>
          </div>
          <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="custom" id="custom" className="mt-0.5" />
            <Label htmlFor="custom" className="cursor-pointer flex-1">
              <div className="font-medium">Custom Deal</div>
              <div className="text-sm text-muted-foreground">
                Using a proposal we created for you
              </div>
            </Label>
          </div>
          <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="variation" id="variation" className="mt-0.5" />
            <Label htmlFor="variation" className="cursor-pointer flex-1">
              <div className="font-medium">Blueprint + Variation</div>
              <div className="text-sm text-muted-foreground">
                Using a proposal we created with modifications
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}

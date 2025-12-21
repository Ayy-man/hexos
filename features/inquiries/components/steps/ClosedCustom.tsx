'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ClosedCustomProps {
  isVariation?: boolean
}

export function ClosedCustom({ isVariation = false }: ClosedCustomProps) {
  const { register } = useFormContext()

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        This form will help us understand exactly what you closed so we can start the onboarding
        and project. We will find the deal using the prospect&apos;s name below.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prospect_company_name">Prospect Company Name *</Label>
          <Input
            id="prospect_company_name"
            placeholder="Acme Corp"
            {...register('prospect_company_name')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="additional_notes">Additional Notes *</Label>
          <Textarea
            id="additional_notes"
            placeholder={
              isVariation
                ? "Tell us more about the deal - anything we should know outside of the proposal we gave you? Share any scope changes or expectations"
                : "Tell us more about the deal - anything we should know outside of the proposal we gave you?"
            }
            rows={6}
            {...register('additional_notes')}
          />
        </div>
      </div>
    </div>
  )
}

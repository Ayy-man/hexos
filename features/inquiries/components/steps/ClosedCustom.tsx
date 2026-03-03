'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Video } from 'lucide-react'
import { ItemMultiSelect } from '../ItemMultiSelect'
import type { BlueprintSummary } from '@/lib/api/blueprints'
import type { CaseStudy } from '@/lib/api/case-studies'
import type { SelectionItem } from '@/features/inquiries/types'

interface ClosedCustomProps {
  isVariation?: boolean
  blueprints?: BlueprintSummary[]
  caseStudies?: CaseStudy[]
}

export function ClosedCustom({ isVariation = false, blueprints, caseStudies }: ClosedCustomProps) {
  const { register, watch, setValue } = useFormContext()

  const selections: SelectionItem[] = watch('selections') || []

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
          <Label htmlFor="meeting_recording_url" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Meeting Recording URL
          </Label>
          <Input
            id="meeting_recording_url"
            type="url"
            inputMode="url"
            placeholder="Fathom, Fireflies, or other recording link"
            {...register('meeting_recording_url')}
          />
          <p className="text-xs text-muted-foreground">
            Optional: Add your Fathom, Fireflies, or other meeting recording link
          </p>
        </div>

        {isVariation && blueprints && caseStudies && (
          <div className="space-y-2">
            <Label>Which Blueprint(s) / Case Study(ies) is this regarding? *</Label>
            <ItemMultiSelect
              blueprints={blueprints}
              caseStudies={caseStudies}
              value={selections}
              onChange={(items) => setValue('selections', items)}
            />
          </div>
        )}

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

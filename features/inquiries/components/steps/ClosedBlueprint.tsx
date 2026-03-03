'use client'

import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Video } from 'lucide-react'
import { PRIMARY_GOAL_OPTIONS } from '../../constants/fieldMappings'
import { BlueprintDetailsSidebar } from '../BlueprintDetailsSidebar'
import { ItemMultiSelect } from '../ItemMultiSelect'
import { CaseStudyPreviewSidebar } from '../CaseStudyPreviewSidebar'
import type { BlueprintSummary, PricingTier } from '@/lib/api/blueprints'
import type { CaseStudy } from '@/lib/api/case-studies'
import type { SelectionItem } from '@/features/inquiries/types'

interface ClosedBlueprintProps {
  blueprints: BlueprintSummary[]
  caseStudies: CaseStudy[]
}

export function ClosedBlueprint({ blueprints, caseStudies }: ClosedBlueprintProps) {
  const { register, watch, setValue } = useFormContext()

  const selections: SelectionItem[] = watch('selections') || []
  const [focusedItem, setFocusedItem] = useState<SelectionItem | null>(selections[0] || null)

  // Focused blueprint for sidebar (focused item if blueprint, else first blueprint in selections)
  const focusedBlueprint = (() => {
    const focused = focusedItem?.type === 'blueprint' ? focusedItem : null
    const firstBp = selections.find((s) => s.type === 'blueprint') || null
    const targetId = focused?.id || firstBp?.id || null
    return targetId ? blueprints.find((b) => b.id === targetId) || null : null
  })()

  // Focused case study for sidebar
  const focusedCaseStudy = (() => {
    const focused = focusedItem?.type === 'case_study' ? focusedItem : null
    const firstCs = selections.find((s) => s.type === 'case_study') || null
    const targetId = focused?.id || firstCs?.id || null
    return targetId ? caseStudies.find((c) => c.id === targetId) || null : null
  })()

  // Show blueprint sidebar when focused item is blueprint, or no case study is selected
  const showBlueprintSidebar =
    focusedBlueprint !== null || selections.every((s) => s.type !== 'case_study')

  const handleTierSelect = (tierName: string, tier: PricingTier) => {
    setValue('selected_tier_name', tierName)
    setValue('selected_tier_price', tier.setup_price)
    setValue('selected_tier_monthly', tier.monthly_price)
    setValue('selected_tier_features', tier.features)
    setValue('selected_tier_blueprint_id', focusedBlueprint?.id || null)
  }

  return (
    <div className="flex gap-6">
      {/* Form Section */}
      <div className="flex-1 space-y-8">
        <p className="text-sm text-muted-foreground">
          This form will help us understand exactly what you closed so we can start the onboarding and project.
        </p>

        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <h3 className="font-medium border-b pb-2">Basic Info</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prospect_company_name">Prospect Company Name *</Label>
              <Input
                id="prospect_company_name"
                placeholder="Acme Corp"
                {...register('prospect_company_name')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prospect_website">Prospect Website *</Label>
              <Input
                id="prospect_website"
                placeholder="https://example.com"
                {...register('prospect_website')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry *</Label>
            <Input
              id="industry"
              placeholder="e.g., Real Estate, Healthcare, E-commerce"
              {...register('industry')}
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

          <div className="space-y-2">
            <Label>Which Blueprint(s) / Case Study(ies) is this regarding? *</Label>
            <ItemMultiSelect
              blueprints={blueprints}
              caseStudies={caseStudies}
              value={selections}
              onChange={(items) => {
                setValue('selections', items)
                // Clear tier if the blueprint it was selected for was removed
                const tierBlueprintId = watch('selected_tier_blueprint_id')
                if (
                  tierBlueprintId &&
                  !items.some((s) => s.type === 'blueprint' && s.id === tierBlueprintId)
                ) {
                  setValue('selected_tier_name', undefined)
                  setValue('selected_tier_price', undefined)
                  setValue('selected_tier_monthly', undefined)
                  setValue('selected_tier_features', undefined)
                  setValue('selected_tier_blueprint_id', undefined)
                }
              }}
              onFocusedItemChange={setFocusedItem}
            />
          </div>
        </div>

        {/* Section 2: Client Context */}
        <div className="space-y-4">
          <h3 className="font-medium border-b pb-2">Client Context</h3>

          <div className="space-y-2">
            <Label htmlFor="monthly_volume">Monthly Volume *</Label>
            <Input
              id="monthly_volume"
              placeholder="e.g., 500 leads/month, 200 customers"
              {...register('monthly_volume')}
            />
            <p className="text-xs text-muted-foreground">
              How many customers, leads, or interactions does the client typically handle monthly?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_tools">Current Tools *</Label>
            <Input
              id="current_tools"
              placeholder="e.g., HubSpot, Calendly, Mailchimp"
              {...register('current_tools')}
            />
            <p className="text-xs text-muted-foreground">
              What tools or platforms is the client currently using?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="existing_crm">Existing CRM *</Label>
            <Input
              id="existing_crm"
              placeholder="e.g., Salesforce, HubSpot, None"
              {...register('existing_crm')}
            />
            <p className="text-xs text-muted-foreground">
              Does the client already have a CRM or database to plug into?
            </p>
          </div>

          <div className="space-y-2">
            <Label>Primary Goal *</Label>
            <Select
              value={watch('primary_goal') || ''}
              onValueChange={(value) => setValue('primary_goal', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="What's the #1 result the client wants?" />
              </SelectTrigger>
              <SelectContent>
                {PRIMARY_GOAL_OPTIONS.map((goal) => (
                  <SelectItem key={goal} value={goal}>
                    {goal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional_notes">Additional Notes *</Label>
            <Textarea
              id="additional_notes"
              placeholder="Tell us more about the deal - anything we should know?"
              rows={4}
              {...register('additional_notes')}
            />
          </div>
        </div>
      </div>

      {/* Preview Sidebar */}
      <div className="w-[320px] flex-shrink-0 hidden lg:block">
        <div className="sticky top-4">
          {showBlueprintSidebar ? (
            <BlueprintDetailsSidebar
              blueprint={focusedBlueprint}
              selectedTier={watch('selected_tier_name')}
              onSelectTier={handleTierSelect}
            />
          ) : (
            <CaseStudyPreviewSidebar caseStudy={focusedCaseStudy} />
          )}
        </div>
      </div>
    </div>
  )
}

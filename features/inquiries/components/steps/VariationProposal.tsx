'use client'

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
import type { SelectionItem, TierSelection } from '@/features/inquiries/types'

interface VariationProposalProps {
  blueprints: BlueprintSummary[]
  caseStudies: CaseStudy[]
}

export function VariationProposal({ blueprints, caseStudies }: VariationProposalProps) {
  const { register, watch, setValue } = useFormContext()

  const selections: SelectionItem[] = watch('selections') || []
  const tierSelections: TierSelection[] = watch('tier_selections') || []

  // Get selected blueprints and case studies in selection order
  const selectedBlueprints = selections
    .filter((s) => s.type === 'blueprint')
    .map((s) => blueprints.find((b) => b.id === s.id))
    .filter(Boolean) as BlueprintSummary[]

  const selectedCaseStudies = selections
    .filter((s) => s.type === 'case_study')
    .map((s) => caseStudies.find((c) => c.id === s.id))
    .filter(Boolean) as CaseStudy[]

  const handleTierSelect = (blueprint: BlueprintSummary, tierName: string, tier: PricingTier) => {
    const existing = tierSelections.filter((t) => t.blueprint_id !== blueprint.id)
    const updated: TierSelection[] = [
      ...existing,
      {
        blueprint_id: blueprint.id,
        blueprint_name: blueprint.name,
        tier_name: tierName,
        setup_price: tier.setup_price,
        monthly_price: tier.monthly_price,
        features: tier.features,
      },
    ]
    setValue('tier_selections', updated)
  }

  return (
    <div className="flex gap-6">
      {/* Form Section */}
      <div className="flex-1 space-y-8">
        <p className="text-sm text-muted-foreground">
          This form will help us understand what those changes are so we can tell you how it&apos;ll
          affect the final price, timeline and overall feasibility of the project! The more detail
          you provide the easier it will be for us.
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
                type="url"
                inputMode="url"
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
                // Remove tier selections for blueprints that were deselected
                const selectedBpIds = new Set(
                  items.filter((s) => s.type === 'blueprint').map((s) => s.id)
                )
                const filteredTiers = tierSelections.filter((t) =>
                  selectedBpIds.has(t.blueprint_id)
                )
                if (filteredTiers.length !== tierSelections.length) {
                  setValue('tier_selections', filteredTiers)
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="variation_description">Variation Description *</Label>
            <Textarea
              id="variation_description"
              placeholder="What is the variation upon the blueprint? Please give as much detail as you can about what they want built and how it's different to what we've outlined in the blueprint guide documents."
              rows={5}
              {...register('variation_description')}
            />
            <p className="text-xs text-muted-foreground">
              Be specific about what&apos;s different from the standard blueprint
            </p>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="existing_crm">Existing CRM *</Label>
            <Input
              id="existing_crm"
              placeholder="e.g., Salesforce, HubSpot, None"
              {...register('existing_crm')}
            />
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
            <Label htmlFor="special_notes">Special Notes *</Label>
            <Textarea
              id="special_notes"
              placeholder="Any special notes, restrictions, or expectations we should know?"
              rows={4}
              {...register('special_notes')}
            />
          </div>
        </div>
      </div>

      {/* Preview Sidebar */}
      <div className="w-[320px] flex-shrink-0 hidden lg:block">
        <div className="sticky top-4 space-y-4">
          {selections.length === 0 && (
            <BlueprintDetailsSidebar
              blueprint={null}
              selectedTier={null}
              onSelectTier={() => {}}
            />
          )}
          {selectedBlueprints.map((bp) => (
            <BlueprintDetailsSidebar
              key={bp.id}
              blueprint={bp}
              idPrefix={`bp-${bp.id}-`}
              selectedTier={
                tierSelections.find((t) => t.blueprint_id === bp.id)?.tier_name || null
              }
              onSelectTier={(tierName, tier) => handleTierSelect(bp, tierName, tier)}
            />
          ))}
          {selectedCaseStudies.map((cs) => (
            <CaseStudyPreviewSidebar key={cs.id} caseStudy={cs} />
          ))}
        </div>
      </div>
    </div>
  )
}

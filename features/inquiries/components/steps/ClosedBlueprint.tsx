'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PRIMARY_GOAL_OPTIONS } from '../../constants/fieldMappings'

interface ClosedBlueprintProps {
  blueprints: Array<{ id: string; name: string; description: string | null; base_price: number | null }>
}

export function ClosedBlueprint({ blueprints }: ClosedBlueprintProps) {
  const { register, watch, setValue } = useFormContext()

  return (
    <div className="space-y-8">
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
          <Label>Which Blueprint is this regarding? *</Label>
          <Select
            value={watch('blueprint_id') || ''}
            onValueChange={(value) => setValue('blueprint_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a blueprint" />
            </SelectTrigger>
            <SelectContent>
              {blueprints.map((bp) => (
                <SelectItem key={bp.id} value={bp.id}>
                  {bp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
  )
}

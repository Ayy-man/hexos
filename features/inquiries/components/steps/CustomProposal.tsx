'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DEPARTMENT_OPTIONS,
  REVENUE_OPTIONS,
  PROJECT_TIER_OPTIONS,
  SUPPORT_LEVEL_OPTIONS,
} from '../../constants/fieldMappings'

export function CustomProposal() {
  const { register, watch, setValue } = useFormContext()

  const departmentsInvolved = watch('departments_involved') || []
  const supportLevel = watch('support_level') || []

  const toggleArrayValue = (field: string, value: string, currentValues: string[]) => {
    if (currentValues.includes(value)) {
      setValue(field, currentValues.filter((v) => v !== value))
    } else {
      setValue(field, [...currentValues, value])
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        This means that you have conducted a discovery call and determined that the prospect needs
        something outside of our Blueprint Library. This form will help us understand exactly what
        the client needs so we can put together a proposal.
      </p>

      {/* Section 1: Prospect & Relationship Info */}
      <div className="space-y-4">
        <h3 className="font-medium border-b pb-2">Prospect & Relationship Info</h3>

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

        <div className="space-y-3">
          <Label>Build Preference *</Label>
          <RadioGroup
            value={watch('build_preference') || ''}
            onValueChange={(value) => setValue('build_preference', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="quick_win" id="quick_win" />
              <Label htmlFor="quick_win" className="font-normal">
                Quick Win (Get something live fast ~24-48 hour proposal)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full_build" id="full_build" />
              <Label htmlFor="full_build" className="font-normal">
                Full Build Straight Away (~48-72 hour proposal)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Relationship Type *</Label>
          <RadioGroup
            value={watch('relationship_type') || ''}
            onValueChange={(value) => setValue('relationship_type', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="warm_referral" id="warm_referral" />
              <Label htmlFor="warm_referral" className="font-normal">
                Existing client, close friend, or warm referral
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="warm_outreach" id="warm_outreach" />
              <Label htmlFor="warm_outreach" className="font-normal">
                Warm outreach or good vibe from the discovery call
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cold_lead" id="cold_lead" />
              <Label htmlFor="cold_lead" className="font-normal">
                Cold lead or first conversation
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Contact Role *</Label>
          <RadioGroup
            value={watch('contact_role') || ''}
            onValueChange={(value) => setValue('contact_role', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="founder" id="founder" />
              <Label htmlFor="founder" className="font-normal">
                Founder or primary decision-maker
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="department_lead" id="department_lead" />
              <Label htmlFor="department_lead" className="font-normal">
                Department lead or internal influencer
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="assistant" id="assistant" />
              <Label htmlFor="assistant" className="font-normal">
                Assistant, coordinator, or not sure
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Budget Indication *</Label>
          <RadioGroup
            value={watch('budget_indication') || ''}
            onValueChange={(value) => setValue('budget_indication', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="specific_number" id="specific_number" />
              <Label htmlFor="specific_number" className="font-normal">
                Yes, they gave a specific number
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="general_range" id="general_range" />
              <Label htmlFor="general_range" className="font-normal">
                Yes, but only a general range or vague answer
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no_budget" id="no_budget" />
              <Label htmlFor="no_budget" className="font-normal">
                No budget mentioned at all
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Urgency *</Label>
          <RadioGroup
            value={watch('urgency') || ''}
            onValueChange={(value) => setValue('urgency', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="asap" id="asap" />
              <Label htmlFor="asap" className="font-normal">
                ASAP or within the next 7 days
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="thirty_days" id="thirty_days" />
              <Label htmlFor="thirty_days" className="font-normal">
                Within the next 30 days
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="exploratory" id="exploratory" />
              <Label htmlFor="exploratory" className="font-normal">
                No clear urgency — more of an exploratory chat
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Engagement Level *</Label>
          <RadioGroup
            value={watch('engagement_level') || ''}
            onValueChange={(value) => setValue('engagement_level', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="very_interested" id="very_interested" />
              <Label htmlFor="very_interested" className="font-normal">
                Very interested — asked about pricing or next steps
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passive" id="passive" />
              <Label htmlFor="passive" className="font-normal">
                Seemed passive or uncertain
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Problem Importance *</Label>
          <RadioGroup
            value={watch('problem_importance') || ''}
            onValueChange={(value) => setValue('problem_importance', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="business_critical" id="business_critical" />
              <Label htmlFor="business_critical" className="font-normal">
                Business-critical — it&apos;s blocking revenue, time, or operations
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="important" id="important" />
              <Label htmlFor="important" className="font-normal">
                Important but a minor inefficiency they&apos;d like to improve
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="nice_to_have" id="nice_to_have" />
              <Label htmlFor="nice_to_have" className="font-normal">
                Just a nice-to-have or experimental idea
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Section 2: Process Overview & Challenges */}
      <div className="space-y-4">
        <h3 className="font-medium border-b pb-2">Process Overview & Challenges</h3>

        <div className="space-y-3">
          <Label>Departments Involved *</Label>
          <p className="text-xs text-muted-foreground">Which departments will be affected by the automation?</p>
          <div className="grid grid-cols-2 gap-2">
            {DEPARTMENT_OPTIONS.map((dept) => (
              <div key={dept} className="flex items-center space-x-2">
                <Checkbox
                  id={`dept-${dept}`}
                  checked={departmentsInvolved.includes(dept)}
                  onCheckedChange={() => toggleArrayValue('departments_involved', dept, departmentsInvolved)}
                />
                <Label htmlFor={`dept-${dept}`} className="font-normal">
                  {dept}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="current_workflow">Current Workflow *</Label>
          <Textarea
            id="current_workflow"
            placeholder="Walk us through the workflow they're currently using for this process. Who is responsible at each step, and what tools are used?"
            rows={4}
            {...register('current_workflow')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="main_challenges">Main Challenges *</Label>
          <Textarea
            id="main_challenges"
            placeholder="What are the main challenges or inefficiencies in their current processes?"
            rows={4}
            {...register('main_challenges')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tasks_to_automate">Tasks to Automate *</Label>
          <Textarea
            id="tasks_to_automate"
            placeholder="What specific tasks or processes do you want to automate? List the exact tasks."
            rows={4}
            {...register('tasks_to_automate')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="automation_goals">Automation Goals *</Label>
          <Textarea
            id="automation_goals"
            placeholder="What are their primary goals with automation? How will you measure ROI?"
            rows={4}
            {...register('automation_goals')}
          />
        </div>
      </div>

      {/* Section 3: Client Context */}
      <div className="space-y-4">
        <h3 className="font-medium border-b pb-2">Client Context</h3>

        <div className="space-y-2">
          <Label htmlFor="current_tools_detailed">Current Tools & Platforms *</Label>
          <Input
            id="current_tools_detailed"
            placeholder="e.g., HubSpot, Salesforce, Zapier, Google Sheets, Slack"
            {...register('current_tools_detailed')}
          />
        </div>

        <div className="space-y-3">
          <Label>Do they have existing automations in place? *</Label>
          <RadioGroup
            value={watch('existing_automations') || ''}
            onValueChange={(value) => setValue('existing_automations', value)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="existing_yes" />
              <Label htmlFor="existing_yes" className="font-normal">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="existing_no" />
              <Label htmlFor="existing_no" className="font-normal">No</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Section 4: Budget & Timeline */}
      <div className="space-y-4">
        <h3 className="font-medium border-b pb-2">Budget & Timeline</h3>

        <div className="space-y-3">
          <Label>Client Annual Revenue *</Label>
          <RadioGroup
            value={watch('client_annual_revenue') || ''}
            onValueChange={(value) => setValue('client_annual_revenue', value)}
            className="grid grid-cols-2 gap-2"
          >
            {REVENUE_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={`rev-${opt.value}`} />
                <Label htmlFor={`rev-${opt.value}`} className="font-normal text-sm">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Project Tier *</Label>
          <p className="text-xs text-muted-foreground">
            The project tier sets the foundation for what we can achieve together.
          </p>
          <RadioGroup
            value={watch('project_tier') || ''}
            onValueChange={(value) => setValue('project_tier', value)}
            className="space-y-2"
          >
            {PROJECT_TIER_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={`tier-${opt.value}`} />
                <Label htmlFor={`tier-${opt.value}`} className="font-normal">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Project Duration *</Label>
          <RadioGroup
            value={watch('project_duration') || ''}
            onValueChange={(value) => setValue('project_duration', value)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="one_time" id="one_time" />
              <Label htmlFor="one_time" className="font-normal">One-Time Project</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ongoing" id="ongoing" />
              <Label htmlFor="ongoing" className="font-normal">Ongoing Maintenance / Support Needed</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="go_live_date">Preferred Go-Live Date *</Label>
          <Input
            id="go_live_date"
            placeholder="e.g., End of January, Before product launch on Feb 15"
            {...register('go_live_date')}
          />
        </div>
      </div>

      {/* Section 5: Additional Support */}
      <div className="space-y-4">
        <h3 className="font-medium border-b pb-2">Additional Support & Next Steps</h3>

        <div className="space-y-3">
          <Label>Support Level *</Label>
          <p className="text-xs text-muted-foreground">What level of support do you expect post-implementation?</p>
          <div className="space-y-2">
            {SUPPORT_LEVEL_OPTIONS.map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <Checkbox
                  id={`support-${opt}`}
                  checked={supportLevel.includes(opt)}
                  onCheckedChange={() => toggleArrayValue('support_level', opt, supportLevel)}
                />
                <Label htmlFor={`support-${opt}`} className="font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additional_notes">Additional Notes</Label>
          <Textarea
            id="additional_notes"
            placeholder="Any additional notes or special requests?"
            rows={4}
            {...register('additional_notes')}
          />
        </div>
      </div>
    </div>
  )
}

'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Building2,
  Users,
  Wallet,
  Clock,
  Zap,
  Settings,
  MessageSquare,
  Target,
  Briefcase,
  CalendarDays,
  Wrench,
} from 'lucide-react'
import {
  DEPARTMENT_OPTIONS,
  REVENUE_OPTIONS,
  PROJECT_TIER_OPTIONS,
  SUPPORT_LEVEL_OPTIONS,
} from '../../constants/fieldMappings'

// Reusable option card for important choices
function OptionCard({
  value,
  currentValue,
  onSelect,
  title,
  description,
  icon: Icon,
  fieldName,
}: {
  value: string
  currentValue: string
  onSelect: (value: string) => void
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  fieldName?: string
}) {
  const isSelected = currentValue === value
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      data-field={fieldName}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border text-left transition-all w-full',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
      )}
    >
      {Icon && (
        <div className={cn(
          'mt-0.5 p-1.5 rounded-md',
          isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={cn('font-medium text-sm', isSelected && 'text-primary')}>{title}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        )}
      </div>
      <div className={cn(
        'h-4 w-4 rounded-full border-2 mt-0.5 flex-shrink-0',
        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
      )}>
        {isSelected && <div className="h-full w-full rounded-full bg-white scale-[0.4]" />}
      </div>
    </button>
  )
}

// Compact inline radio for simple yes/no or short options
function InlineRadioGroup({
  value,
  onValueChange,
  options,
  fieldName,
}: {
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  fieldName?: string
}) {
  return (
    <div className="flex flex-wrap gap-2" data-field={fieldName}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onValueChange(opt.value)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all',
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// Section wrapper with icon
function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-0.5">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  )
}

// Question group with label
function QuestionGroup({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

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
    <div className="space-y-6">
      {/* Section 1: Prospect Info */}
      <FormSection
        icon={Building2}
        title="Prospect Info"
        description="Basic details about the company"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="prospect_company_name">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prospect_company_name"
              placeholder="Acme Corp"
              {...register('prospect_company_name')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prospect_website">
              Website <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prospect_website"
              placeholder="https://example.com"
              {...register('prospect_website')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">
            Industry <span className="text-destructive">*</span>
          </Label>
          <Input
            id="industry"
            placeholder="e.g., Real Estate, Healthcare, E-commerce"
            {...register('industry')}
          />
        </div>
      </FormSection>

      {/* Section 2: Build Preference */}
      <FormSection
        icon={Zap}
        title="Build Preference"
        description="How quickly do you need the proposal?"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard
            value="quick_win"
            currentValue={watch('build_preference') || ''}
            onSelect={(v) => setValue('build_preference', v)}
            icon={Zap}
            title="Quick Win"
            description="Get something live fast — 24-48 hour proposal"
            fieldName="build_preference"
          />
          <OptionCard
            value="full_build"
            currentValue={watch('build_preference') || ''}
            onSelect={(v) => setValue('build_preference', v)}
            icon={Briefcase}
            title="Full Build"
            description="Comprehensive solution — 48-72 hour proposal"
            fieldName="build_preference"
          />
        </div>
      </FormSection>

      {/* Section 3: Lead Qualification */}
      <FormSection
        icon={Users}
        title="Lead Qualification"
        description="Help us understand the opportunity"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <QuestionGroup label="Relationship Type" required>
            <RadioGroup
              value={watch('relationship_type') || ''}
              onValueChange={(value) => setValue('relationship_type', value)}
              className="space-y-2"
              data-field="relationship_type"
            >
              {[
                { value: 'warm_referral', label: 'Warm referral or existing client' },
                { value: 'warm_outreach', label: 'Good vibe from discovery call' },
                { value: 'cold_lead', label: 'Cold lead / first conversation' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </QuestionGroup>

          <QuestionGroup label="Contact Role" required>
            <RadioGroup
              value={watch('contact_role') || ''}
              onValueChange={(value) => setValue('contact_role', value)}
              className="space-y-2"
              data-field="contact_role"
            >
              {[
                { value: 'founder', label: 'Founder / Decision-maker' },
                { value: 'department_lead', label: 'Department lead' },
                { value: 'assistant', label: 'Assistant / Coordinator' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value={opt.value} id={`contact-${opt.value}`} />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </QuestionGroup>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuestionGroup label="Budget Indication" required>
            <div className="flex gap-2" data-field="budget_indication">
              {[
                { value: 'specific_number', label: 'Specific $' },
                { value: 'general_range', label: 'Vague range' },
                { value: 'no_budget', label: 'No mention' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('budget_indication', opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                    watch('budget_indication') === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </QuestionGroup>

          <QuestionGroup label="Urgency" required>
            <div className="flex gap-2" data-field="urgency">
              {[
                { value: 'asap', label: '< 7 days' },
                { value: 'thirty_days', label: '< 30 days' },
                { value: 'exploratory', label: 'No rush' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('urgency', opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                    watch('urgency') === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </QuestionGroup>

          <QuestionGroup label="Engagement" required>
            <div className="flex gap-2" data-field="engagement_level">
              {[
                { value: 'very_interested', label: 'Interested' },
                { value: 'passive', label: 'Passive' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('engagement_level', opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                    watch('engagement_level') === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </QuestionGroup>
        </div>

        <QuestionGroup label="Problem Importance" required>
          <div className="grid gap-3 sm:grid-cols-3">
            <OptionCard
              value="business_critical"
              currentValue={watch('problem_importance') || ''}
              onSelect={(v) => setValue('problem_importance', v)}
              title="Business-critical"
              description="Blocking revenue or operations"
              fieldName="problem_importance"
            />
            <OptionCard
              value="important"
              currentValue={watch('problem_importance') || ''}
              onSelect={(v) => setValue('problem_importance', v)}
              title="Important"
              description="Minor inefficiency to improve"
              fieldName="problem_importance"
            />
            <OptionCard
              value="nice_to_have"
              currentValue={watch('problem_importance') || ''}
              onSelect={(v) => setValue('problem_importance', v)}
              title="Nice-to-have"
              description="Experimental or exploratory"
              fieldName="problem_importance"
            />
          </div>
        </QuestionGroup>
      </FormSection>

      {/* Section 4: Process Details */}
      <FormSection
        icon={Settings}
        title="Process Details"
        description="Help us understand their current workflow"
      >
        <QuestionGroup label="Departments Involved" hint="Select all that apply" required>
          <div className="flex flex-wrap gap-2" data-field="departments_involved">
            {DEPARTMENT_OPTIONS.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => toggleArrayValue('departments_involved', dept, departmentsInvolved)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  departmentsInvolved.includes(dept)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
              >
                {dept}
              </button>
            ))}
          </div>
        </QuestionGroup>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="current_workflow">
              Current Workflow <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="current_workflow"
              placeholder="Walk us through their current process. Who does what? What tools?"
              rows={4}
              className="resize-none"
              {...register('current_workflow')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="main_challenges">
              Main Challenges <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="main_challenges"
              placeholder="What pain points or inefficiencies exist?"
              rows={4}
              className="resize-none"
              {...register('main_challenges')}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tasks_to_automate">
              Tasks to Automate <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="tasks_to_automate"
              placeholder="List the specific tasks they want automated"
              rows={4}
              className="resize-none"
              {...register('tasks_to_automate')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="automation_goals">
              Automation Goals <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="automation_goals"
              placeholder="What outcomes do they expect? How will they measure success?"
              rows={4}
              className="resize-none"
              {...register('automation_goals')}
            />
          </div>
        </div>
      </FormSection>

      {/* Section 5: Tech Context */}
      <FormSection
        icon={Wrench}
        title="Tech Context"
        description="Current tools and technical setup"
      >
        <div className="space-y-2">
          <Label htmlFor="current_tools_detailed">
            Current Tools & Platforms <span className="text-destructive">*</span>
          </Label>
          <Input
            id="current_tools_detailed"
            placeholder="e.g., HubSpot, Salesforce, Zapier, Google Sheets, Slack"
            {...register('current_tools_detailed')}
          />
        </div>

        <QuestionGroup label="Existing automations in place?" required>
          <InlineRadioGroup
            value={watch('existing_automations') || ''}
            onValueChange={(v) => setValue('existing_automations', v)}
            fieldName="existing_automations"
            options={[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
          />
        </QuestionGroup>
      </FormSection>

      {/* Section 6: Budget & Timeline */}
      <FormSection
        icon={Wallet}
        title="Budget & Timeline"
        description="Financial and scheduling expectations"
      >
        <QuestionGroup label="Client Annual Revenue" required>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-field="client_annual_revenue">
            {REVENUE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('client_annual_revenue', opt.value)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all text-center',
                  watch('client_annual_revenue') === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </QuestionGroup>

        <QuestionGroup label="Project Tier" hint="This sets the foundation for what we can achieve" required>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECT_TIER_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                value={opt.value}
                currentValue={watch('project_tier') || ''}
                onSelect={(v) => setValue('project_tier', v)}
                title={opt.label.split(':')[0]}
                description={opt.label.includes(':') ? opt.label.split(':')[1].trim() : undefined}
                fieldName="project_tier"
              />
            ))}
          </div>
        </QuestionGroup>

        <div className="grid gap-6 lg:grid-cols-2">
          <QuestionGroup label="Project Duration" required>
            <InlineRadioGroup
              value={watch('project_duration') || ''}
              onValueChange={(v) => setValue('project_duration', v)}
              fieldName="project_duration"
              options={[
                { value: 'one_time', label: 'One-time project' },
                { value: 'ongoing', label: 'Ongoing support needed' },
              ]}
            />
          </QuestionGroup>

          <div className="space-y-2">
            <Label htmlFor="go_live_date">
              Preferred Go-Live Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="go_live_date"
              placeholder="e.g., End of January, Before Feb 15 launch"
              {...register('go_live_date')}
            />
          </div>
        </div>
      </FormSection>

      {/* Section 7: Additional Support */}
      <FormSection
        icon={MessageSquare}
        title="Support & Notes"
        description="Post-implementation expectations and additional context"
      >
        <QuestionGroup label="Support Level" hint="What do they expect after go-live?" required>
          <div className="flex flex-wrap gap-2" data-field="support_level">
            {SUPPORT_LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleArrayValue('support_level', opt, supportLevel)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  supportLevel.includes(opt)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </QuestionGroup>

        <div className="space-y-2">
          <Label htmlFor="additional_notes">Additional Notes</Label>
          <Textarea
            id="additional_notes"
            placeholder="Any additional context, special requests, or things we should know?"
            rows={4}
            className="resize-none"
            {...register('additional_notes')}
          />
        </div>
      </FormSection>
    </div>
  )
}

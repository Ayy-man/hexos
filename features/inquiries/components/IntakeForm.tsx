'use client'

import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react'

import { InitialStep } from './steps/InitialStep'
import { ClosedDealType } from './steps/ClosedDealType'
import { ProposalType } from './steps/ProposalType'
import { ClosedBlueprint } from './steps/ClosedBlueprint'
import { ClosedCustom } from './steps/ClosedCustom'
import { VariationProposal } from './steps/VariationProposal'
import { CustomProposal } from './steps/CustomProposal'
import { BlueprintInfo } from './steps/BlueprintInfo'
import { ForwardForm } from './steps/ForwardForm'
import { ConfirmationScreen } from './steps/ConfirmationScreen'
import { AICopilotSidebar } from './AICopilotSidebar'
import { FormStepIndicator } from './FormStepIndicator'

import { getFormPath, type FormPath, type IntakeFormState } from '../schemas/intakeFormSchema'
import { submitInquiry } from '../actions/submitInquiry'
import type { CreateInquiryData } from '../types'

// Base schema for all paths
const baseSchema = z.object({
  submission_type: z.enum(['closed', 'proposal']).optional(),
  partner_name: z.string().optional(),
  closed_deal_type: z.enum(['blueprint', 'custom', 'variation']).optional(),
  proposal_type: z.enum(['blueprint', 'variation', 'custom']).optional(),
}).passthrough()

interface IntakeFormProps {
  blueprints: Array<{ id: string; name: string; description: string | null; base_price: number | null }>
  partnerName: string
}

type Step =
  | 'initial'
  | 'closed_type'
  | 'proposal_type'
  | 'path_form'
  | 'forward'
  | 'confirmation'

export function IntakeForm({ blueprints, partnerName }: IntakeFormProps) {
  const [step, setStep] = useState<Step>('initial')
  const [copilotEnabled, setCopilotEnabled] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedPath, setSubmittedPath] = useState<FormPath | null>(null)
  const [submittedInquiryId, setSubmittedInquiryId] = useState<string | null>(null)

  const methods = useForm<IntakeFormState>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      partner_name: partnerName,
    },
  })

  const { watch, handleSubmit, setValue } = methods
  const formData = watch()

  const currentPath = getFormPath(
    formData.submission_type,
    formData.closed_deal_type,
    formData.proposal_type
  )

  // Navigation logic - uses getValues() for fresh data (not stale closure)
  const handleNext = () => {
    const data = methods.getValues()
    const freshPath = getFormPath(data.submission_type, data.closed_deal_type, data.proposal_type)

    if (step === 'initial') {
      if (data.submission_type === 'closed') {
        setStep('closed_type')
      } else if (data.submission_type === 'proposal') {
        setStep('proposal_type')
      }
    } else if (step === 'closed_type' || step === 'proposal_type') {
      // B1 path shows info only, no form
      if (freshPath === 'B1') {
        // Stay on proposal_type, show info
      } else {
        setStep('path_form')
      }
    } else if (step === 'path_form') {
      setStep('forward')
    } else if (step === 'forward') {
      onSubmit(data)
    }
  }

  const handleBack = () => {
    const data = methods.getValues()

    if (step === 'closed_type' || step === 'proposal_type') {
      setStep('initial')
    } else if (step === 'path_form') {
      if (data.submission_type === 'closed') {
        setStep('closed_type')
      } else {
        setStep('proposal_type')
      }
    } else if (step === 'forward') {
      setStep('path_form')
    }
  }

  const onSubmit = async (data: IntakeFormState) => {
    if (!currentPath || currentPath === 'B1') return

    setIsSubmitting(true)
    try {
      const inquiryData: CreateInquiryData = {
        partner_name: data.partner_name || '',
        submission_type: data.submission_type as 'closed' | 'proposal',
        deal_type: data.closed_deal_type || data.proposal_type || 'custom',
        form_path: currentPath,
        prospect_company_name: data.prospect_company_name,
        prospect_website: data.prospect_website,
        industry: data.industry,
        blueprint_id: data.blueprint_id,
        form_data: data,
        forward_emails: [data.forward_email_1, data.forward_email_2].filter(Boolean) as string[],
      }

      const inquiry = await submitInquiry(inquiryData)
      setSubmittedPath(currentPath)
      setSubmittedInquiryId(inquiry.id)
      setStep('confirmation')
    } catch (error) {
      console.error('Failed to submit inquiry:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle AI setting form fields
  const handleSetField = (fieldName: string, value: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue(fieldName as any, value, { shouldDirty: true, shouldTouch: true })

    // Trigger visual flash animation on filled field (non-critical, fail silently)
    setTimeout(() => {
      try {
        // Escape special characters in field name for valid CSS selector
        const escapedName = CSS.escape(fieldName)
        const element = document.querySelector(`[name="${escapedName}"], [data-field="${escapedName}"]`)
        if (element) {
          element.classList.add('ai-filled-flash')
          setTimeout(() => element.classList.remove('ai-filled-flash'), 1000)
        }
      } catch {
        // Animation is non-critical, ignore selector errors
      }
    }, 0)
  }

  const getStepTitle = () => {
    switch (step) {
      case 'initial':
        return 'Project Intake Form'
      case 'closed_type':
        return 'Congratulations on the close!'
      case 'proposal_type':
        return 'Request a Proposal'
      case 'path_form':
        return currentPath ? getPathTitle(currentPath) : 'Details'
      case 'forward':
        return 'Forward Form'
      case 'confirmation':
        return submittedPath?.startsWith('A') ? 'Deal Submitted' : 'Proposal Submitted'
      default:
        return 'Project Intake'
    }
  }

  const getPathTitle = (path: FormPath) => {
    switch (path) {
      case 'A1':
        return 'You Closed a Blueprint!'
      case 'A2':
        return 'You Closed a Custom Deal!'
      case 'A3':
        return 'You Closed a Blueprint + Variation!'
      case 'B2':
        return 'Blueprint + Variation Proposal'
      case 'B3':
        return 'Custom Deal Proposal'
      default:
        return 'Details'
    }
  }

  if (step === 'confirmation') {
    return <ConfirmationScreen isClosedDeal={submittedPath?.startsWith('A') || false} inquiryId={submittedInquiryId} />
  }

  // Only show copilot sidebar on the main detail page
  const showCopilot = copilotEnabled && step === 'path_form'

  return (
    <FormProvider {...methods}>
      <div className="flex gap-6">
        {/* Form Panel */}
        <div className={`flex-1 ${showCopilot ? 'max-w-[60%]' : 'max-w-2xl mx-auto'}`}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{getStepTitle()}</CardTitle>
                  {step === 'initial' && (
                    <CardDescription className="mt-1">
                      This is intended for use by Arbitrage Partners of Hexona Systems only.
                    </CardDescription>
                  )}
                </div>
                {/* Only show AI Copilot on the main detail page */}
                {step === 'path_form' && (
                  <div className="flex items-center gap-2">
                    <Bot className={`h-4 w-4 ${copilotEnabled ? 'text-cyan-500' : 'text-muted-foreground'}`} />
                    <Label htmlFor="copilot-toggle" className="text-sm">
                      AI Copilot
                    </Label>
                    <Switch
                      id="copilot-toggle"
                      checked={copilotEnabled}
                      onCheckedChange={setCopilotEnabled}
                    />
                  </div>
                )}
              </div>
              <FormStepIndicator
                currentStep={step}
                submissionType={formData.submission_type}
                currentPath={currentPath}
              />
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {step === 'initial' && <InitialStep />}
                {step === 'closed_type' && <ClosedDealType />}
                {step === 'proposal_type' && (
                  currentPath === 'B1' ? (
                    <BlueprintInfo onBack={handleBack} />
                  ) : (
                    <ProposalType />
                  )
                )}
                {step === 'path_form' && currentPath === 'A1' && (
                  <ClosedBlueprint blueprints={blueprints} />
                )}
                {step === 'path_form' && (currentPath === 'A2' || currentPath === 'A3') && (
                  <ClosedCustom isVariation={currentPath === 'A3'} />
                )}
                {step === 'path_form' && currentPath === 'B2' && (
                  <VariationProposal blueprints={blueprints} />
                )}
                {step === 'path_form' && currentPath === 'B3' && (
                  <CustomProposal />
                )}
                {step === 'forward' && <ForwardForm />}

                {/* Navigation */}
                {currentPath !== 'B1' && (
                  <div className="flex justify-between pt-4 border-t">
                    {step !== 'initial' ? (
                      <Button type="button" variant="outline" onClick={handleBack}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>
                    ) : (
                      <div />
                    )}
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={isSubmitting || !canProceed(step, formData, currentPath)}
                    >
                      {step === 'forward' ? (
                        isSubmitting ? 'Submitting...' : 'Submit'
                      ) : (
                        <>
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* AI Copilot Sidebar - only on detail pages */}
        {showCopilot && (
          <div className="w-[40%] min-w-[350px]">
            <AICopilotSidebar
              currentPath={currentPath}
              onSetField={handleSetField}
              onNext={handleNext}
            />
          </div>
        )}
      </div>
    </FormProvider>
  )
}

// Helper to check if user can proceed to next step
function canProceed(step: Step, data: IntakeFormState, path: FormPath | null): boolean {
  switch (step) {
    case 'initial':
      return !!data.submission_type
    case 'closed_type':
      return !!data.closed_deal_type
    case 'proposal_type':
      return !!data.proposal_type
    case 'path_form':
      // Basic validation - require company name for all paths
      return !!data.prospect_company_name
    case 'forward':
      return true
    default:
      return true
  }
}

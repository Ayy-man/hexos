'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Check, Loader2, Package, ClipboardList, FileCheck } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ProposalDeliverable } from '@/lib/api/proposal-deliverables'
import type { RequirementTemplate } from '@/lib/api/requirement-templates.shared'
import { DeliverablesStep } from './steps/DeliverablesStep'
import { RequirementsStep } from './steps/RequirementsStep'
import { ReviewStep } from './steps/ReviewStep'
import type { RequirementNode } from '../utils/treeHelpers'
import { completeInitiationAction, type InitiateProjectInput } from '../actions/initiationActions'

// ============================================
// Types
// ============================================

interface InquiryData {
  id: string
  prospect_company_name: string
  prospect_website: string | null
  industry: string | null
  partner_name: string
  price_dfy: number | null
  price_hexona: number | null
  price_dev: number | null
  blueprint: { id: string; name: string } | null
  proposal_content: unknown
}

interface InitiateWizardProps {
  inquiry: InquiryData
  deliverables: ProposalDeliverable[]
  templates: RequirementTemplate[]
}

const STEPS = [
  { id: 'deliverables', label: 'Deliverables', icon: Package },
  { id: 'requirements', label: 'Requirements', icon: ClipboardList },
  { id: 'review', label: 'Review', icon: FileCheck },
] as const

type StepId = typeof STEPS[number]['id']

// ============================================
// Component
// ============================================

export function InitiateWizard({ inquiry, deliverables, templates }: InitiateWizardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Current step
  const [currentStep, setCurrentStep] = useState<StepId>('deliverables')
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)

  // Step 1: Deliverables
  const [selectedDeliverableIds, setSelectedDeliverableIds] = useState<string[]>(
    deliverables.map(d => d.id) // Select all by default
  )

  // Step 2: Requirements
  const [requirements, setRequirements] = useState<RequirementNode[]>([])

  // Step 3: Project details
  const [projectData, setProjectData] = useState<InitiateProjectInput>({
    project_name: `${inquiry.prospect_company_name} - ${inquiry.blueprint?.name || 'Custom Project'}`,
    client_name: inquiry.prospect_company_name,
    price_dfy: inquiry.price_dfy || undefined,
    price_hexona: inquiry.price_hexona || undefined,
    price_dev: inquiry.price_dev || undefined,
    payment_structure: '50_50',
  })

  // Navigation
  const canGoBack = currentStepIndex > 0
  const canGoNext = currentStepIndex < STEPS.length - 1
  const isLastStep = currentStepIndex === STEPS.length - 1

  const goBack = () => {
    if (canGoBack) {
      setCurrentStep(STEPS[currentStepIndex - 1].id)
    }
  }

  const goNext = () => {
    if (canGoNext) {
      setCurrentStep(STEPS[currentStepIndex + 1].id)
    }
  }

  // Validation
  const isStepValid = (step: StepId): boolean => {
    switch (step) {
      case 'deliverables':
        return selectedDeliverableIds.length > 0
      case 'requirements':
        return true // Requirements are optional
      case 'review':
        return projectData.project_name.trim().length > 0 && projectData.client_name.trim().length > 0
      default:
        return true
    }
  }

  // Calculate total price from selected deliverables
  const selectedDeliverables = deliverables.filter(d => selectedDeliverableIds.includes(d.id))
  const totalPrice = selectedDeliverables.reduce((sum, d) => {
    const price = d.counter_price ?? d.price ?? 0
    return sum + price
  }, 0)

  // Submit
  const handleSubmit = () => {
    startTransition(async () => {
      try {
        // Prepare requirements for submission
        const requirementInputs = requirements.map(r => ({
          temp_id: r.id,
          parent_temp_id: r.parent_id,
          title: r.title,
          description: r.description || undefined,
          notes: r.notes || undefined,
          owner_type: r.owner_type,
          blocker_type: r.blocker_type,
          loom_url: r.loom_url || undefined,
          resource_url: r.resource_url || undefined,
          position: r.position,
        }))

        const result = await completeInitiationAction(
          inquiry.id,
          {
            ...projectData,
            price_dfy: totalPrice > 0 ? totalPrice : projectData.price_dfy,
          },
          selectedDeliverableIds,
          requirementInputs
        )

        toast.success('Project created successfully!')
        router.push(`/projects/${result.projectId}`)
      } catch (error) {
        console.error('Failed to create project:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to create project')
      }
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-lg font-semibold">{inquiry.prospect_company_name}</h1>
              <p className="text-sm text-muted-foreground">Project Setup</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = index < currentStepIndex
              const isClickable = index <= currentStepIndex || (index === currentStepIndex + 1 && isStepValid(currentStep))

              return (
                <div key={step.id} className="flex items-center">
                  {index > 0 && (
                    <div
                      className={cn(
                        'w-8 h-0.5 mx-1',
                        isCompleted ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}
                  <button
                    onClick={() => isClickable && setCurrentStep(step.id)}
                    disabled={!isClickable}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                      isActive && 'bg-primary text-primary-foreground',
                      isCompleted && !isActive && 'bg-primary/20 text-primary',
                      !isActive && !isCompleted && 'bg-muted text-muted-foreground',
                      isClickable && !isActive && 'hover:bg-muted/80 cursor-pointer',
                      !isClickable && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container py-6">
        {currentStep === 'deliverables' && (
          <DeliverablesStep
            deliverables={deliverables}
            selectedIds={selectedDeliverableIds}
            onSelectionChange={setSelectedDeliverableIds}
            totalPrice={totalPrice}
          />
        )}

        {currentStep === 'requirements' && (
          <RequirementsStep
            requirements={requirements}
            onChange={setRequirements}
            templates={templates}
          />
        )}

        {currentStep === 'review' && (
          <ReviewStep
            projectData={projectData}
            onProjectDataChange={setProjectData}
            selectedDeliverables={selectedDeliverables}
            requirements={requirements}
            totalPrice={totalPrice}
            inquiry={inquiry}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky bottom-0">
        <div className="container flex h-16 items-center justify-between">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={!canGoBack || isPending}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-4">
            {currentStep === 'deliverables' && (
              <span className="text-sm text-muted-foreground">
                {selectedDeliverableIds.length} deliverable{selectedDeliverableIds.length !== 1 ? 's' : ''} selected
              </span>
            )}
            {currentStep === 'requirements' && (
              <span className="text-sm text-muted-foreground">
                {requirements.length} requirement{requirements.length !== 1 ? 's' : ''} added
              </span>
            )}
          </div>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={isPending || !isStepValid(currentStep)}
              className="min-w-[140px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!isStepValid(currentStep) || isPending}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}

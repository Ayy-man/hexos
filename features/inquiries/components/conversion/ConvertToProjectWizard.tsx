'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Package,
  ClipboardList,
  Rocket,
} from 'lucide-react'
import { toast } from 'sonner'
import { RequirementsBuilder, type RequirementItem } from './RequirementsBuilder'
import type { ProposalDeliverable } from '@/lib/api/proposal-deliverables'
import type { ConvertToProjectInput } from '@/lib/api/inquiries'

interface ConvertToProjectWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inquiry: {
    id: string
    prospect_company_name: string | null
    prospect_website: string | null
    industry: string | null
    partner_name: string | null
    estimated_value: number | null
    blueprint?: { name: string } | null
  }
  deliverables: ProposalDeliverable[]
  onConvert: (
    projectData: ConvertToProjectInput,
    deliverableIds: string[],
    requirements: Array<{ title: string; description?: string }>
  ) => Promise<{ projectId: string }>
}

type Step = 'deliverables' | 'requirements' | 'review'

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'deliverables', label: 'Deliverables', icon: <Package className="h-4 w-4" /> },
  { key: 'requirements', label: 'Requirements', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'review', label: 'Review', icon: <Rocket className="h-4 w-4" /> },
]

const DEFAULT_REQUIREMENTS = [
  'Client login credentials (if applicable)',
  'Brand guidelines or style preferences',
  'Access to required platforms/software',
]

export function ConvertToProjectWizard({
  open,
  onOpenChange,
  inquiry,
  deliverables,
  onConvert,
}: ConvertToProjectWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('deliverables')
  const [isPending, startTransition] = useTransition()

  // Step 1: Deliverables
  const [selectedDeliverables, setSelectedDeliverables] = useState<Set<string>>(
    new Set(
      deliverables
        .filter((d) => d.change_status !== 'removed' && d.change_status !== 'rejected')
        .map((d) => d.id)
    )
  )

  // Step 2: Requirements
  const [requirements, setRequirements] = useState<RequirementItem[]>([])

  // Step 3: Project details
  const [projectName, setProjectName] = useState(
    inquiry.prospect_company_name
      ? `${inquiry.prospect_company_name} - ${inquiry.blueprint?.name || 'Project'}`
      : ''
  )
  const [clientName, setClientName] = useState(inquiry.prospect_company_name || '')
  const [notes, setNotes] = useState('')

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  const handleNext = () => {
    const currentIndex = STEPS.findIndex((s) => s.key === step)
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1].key)
    }
  }

  const handleBack = () => {
    const currentIndex = STEPS.findIndex((s) => s.key === step)
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1].key)
    }
  }

  const handleConvert = () => {
    startTransition(async () => {
      try {
        const projectData: ConvertToProjectInput = {
          project_name: projectName,
          client_name: clientName,
          quoted_price: inquiry.estimated_value || undefined,
          notes: notes || undefined,
        }

        const reqData = requirements
          .filter((r) => r.title.trim())
          .map((r) => ({
            title: r.title,
            description: r.description || undefined,
          }))

        const result = await onConvert(
          projectData,
          Array.from(selectedDeliverables),
          reqData
        )

        toast.success('Project created successfully!')
        onOpenChange(false)
        router.push(`/projects/${result.projectId}`)
      } catch (error) {
        console.error('Conversion error:', error)
        toast.error('Failed to create project')
      }
    })
  }

  const toggleDeliverable = (id: string) => {
    const newSet = new Set(selectedDeliverables)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedDeliverables(newSet)
  }

  const selectableDeliverables = deliverables.filter(
    (d) => d.change_status !== 'removed' && d.change_status !== 'rejected'
  )

  const totalPrice = selectableDeliverables
    .filter((d) => selectedDeliverables.has(d.id))
    .reduce((sum, d) => sum + (d.counter_price ?? d.price ?? 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Convert to Project</DialogTitle>
          <DialogDescription>
            Create a project from this closed inquiry.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  i <= stepIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-2 ${
                    i < stepIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Step 1: Deliverables */}
          {step === 'deliverables' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Select Deliverables</h3>
                <Badge variant="outline">
                  {selectedDeliverables.size} of {selectableDeliverables.length} selected
                </Badge>
              </div>

              <div className="space-y-2">
                {selectableDeliverables.map((d) => (
                  <Card
                    key={d.id}
                    className={`cursor-pointer transition-colors ${
                      selectedDeliverables.has(d.id)
                        ? 'border-primary bg-primary/5'
                        : ''
                    }`}
                    onClick={() => toggleDeliverable(d.id)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div
                        className={`h-5 w-5 rounded border flex items-center justify-center ${
                          selectedDeliverables.has(d.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {selectedDeliverables.has(d.id) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{d.name}</div>
                        {d.description && (
                          <div className="text-sm text-muted-foreground truncate">
                            {d.description}
                          </div>
                        )}
                      </div>
                      <div className="font-semibold">
                        {d.counter_price ?? d.price
                          ? `$${(d.counter_price ?? d.price ?? 0).toLocaleString()}`
                          : '-'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <div className="text-lg font-bold">
                  Total: ${totalPrice.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Requirements */}
          {step === 'requirements' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Onboarding Requirements</h3>
                <p className="text-sm text-muted-foreground">
                  Add items that need to be collected from the client before starting.
                </p>
              </div>

              <RequirementsBuilder
                requirements={requirements}
                onChange={setRequirements}
                suggestions={DEFAULT_REQUIREMENTS}
              />
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name *</Label>
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name *</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Enter client name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional notes for the project..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deliverables</span>
                    <span className="font-medium">
                      {selectedDeliverables.size} items
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requirements</span>
                    <span className="font-medium">
                      {requirements.filter((r) => r.title.trim()).length} items
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Value</span>
                    <span className="font-bold">${totalPrice.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="text-sm text-muted-foreground">
                    <p>On creation:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Project will be created in &quot;Collecting Access&quot; status</li>
                      <li>Deliverables will become project milestones</li>
                      <li>Requirements will be added as onboarding checklist</li>
                      <li>Inquiry will be marked as converted</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Separator />

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={stepIndex === 0 || isPending}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            {step !== 'review' && (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 'review' && (
              <ButtonHoldAndRelease
                onComplete={handleConvert}
                holdDuration={2000}
                disabled={isPending || !projectName.trim() || !clientName.trim()}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Hold to Create Project
                  </>
                )}
              </ButtonHoldAndRelease>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import {
  Loader2,
  Sparkles,
  Send,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { DeliverablesTable } from './DeliverablesTable'
import { AddDeliverableModal } from './AddDeliverableModal'
import type { ProposalDeliverable, UpdateDeliverableInput } from '@/lib/api/proposal-deliverables'
import type { DeliverablesNegotiationStatus } from '@/lib/api/inquiries'
import type { Blueprint } from '@/lib/api/blueprints'

interface DeliverablesTabProps {
  inquiryId: string
  deliverables: ProposalDeliverable[]
  deliverablesStatus: DeliverablesNegotiationStatus
  proposalContent: unknown
  blueprints: Blueprint[]
  isAdmin: boolean
  isDfyOwner: boolean
  // Bound server actions
  parseDeliverables: (content: unknown) => Promise<ProposalDeliverable[]>
  createDeliverable: (name: string, description?: string) => Promise<void>
  addFromBlueprintTier: (
    blueprintId: string,
    tierName: string,
    tierPrice: number,
    features: string[]
  ) => Promise<void>
  updateDeliverable: (id: string, input: UpdateDeliverableInput) => Promise<void>
  removeDeliverable: (id: string) => Promise<void>
  revertDeliverable: (id: string) => Promise<void>
  submitForReview: () => Promise<void>
  withdrawSubmission: () => Promise<void>
  reviewDeliverable: (
    id: string,
    decision: 'approved' | 'rejected' | 'countered',
    counterPrice?: number,
    counterNote?: string
  ) => Promise<void>
  bulkApprove: (ids: string[]) => Promise<void>
  finalApprove: () => Promise<void>
  sendBackForRevision: () => Promise<void>
}

export function DeliverablesTab({
  inquiryId,
  deliverables,
  deliverablesStatus,
  proposalContent,
  blueprints,
  isAdmin,
  isDfyOwner,
  parseDeliverables,
  createDeliverable,
  addFromBlueprintTier,
  updateDeliverable,
  removeDeliverable,
  revertDeliverable,
  submitForReview,
  withdrawSubmission,
  reviewDeliverable,
  bulkApprove,
  finalApprove,
  sendBackForRevision,
}: DeliverablesTabProps) {
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, startSubmitTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)

  // Determine UI state
  const isEditable =
    isDfyOwner &&
    (deliverablesStatus === 'dfy_editing' || deliverablesStatus === 'needs_revision')
  const isReviewer = isAdmin && deliverablesStatus === 'int_reviewing'
  const canSubmit = isDfyOwner && isEditable && deliverables.length > 0
  const canWithdraw = isDfyOwner && deliverablesStatus === 'dfy_submitted'
  const canFinalApprove =
    isAdmin &&
    deliverablesStatus === 'int_reviewing' &&
    deliverables.every(
      (d) =>
        d.change_status === 'original' ||
        d.change_status === 'approved' ||
        d.change_status === 'rejected'
    )

  // Pending review count
  const pendingCount = deliverables.filter(
    (d) =>
      d.change_status === 'edited' ||
      d.change_status === 'added' ||
      d.change_status === 'removed'
  ).length

  // Handle AI parsing
  const handleParse = async () => {
    if (!proposalContent) {
      toast.error('No proposal content to parse')
      return
    }

    setIsParsing(true)
    try {
      await parseDeliverables(proposalContent)
      toast.success('Deliverables extracted successfully')
    } catch (error) {
      console.error('Parse error:', error)
      toast.error('Failed to extract deliverables')
    } finally {
      setIsParsing(false)
    }
  }

  // Handle submit for review
  const handleSubmit = () => {
    startSubmitTransition(async () => {
      try {
        await submitForReview()
        toast.success('Changes submitted for review')
      } catch (error) {
        console.error('Submit error:', error)
        toast.error('Failed to submit changes')
      }
    })
  }

  // Handle withdraw
  const handleWithdraw = () => {
    startSubmitTransition(async () => {
      try {
        await withdrawSubmission()
        toast.success('Submission withdrawn')
      } catch (error) {
        console.error('Withdraw error:', error)
        toast.error('Failed to withdraw submission')
      }
    })
  }

  // Handle final approve
  const handleFinalApprove = () => {
    startSubmitTransition(async () => {
      try {
        await finalApprove()
        toast.success('Deliverables approved and locked')
      } catch (error) {
        console.error('Approve error:', error)
        toast.error('Failed to approve deliverables')
      }
    })
  }

  // Handle send back
  const handleSendBack = () => {
    startSubmitTransition(async () => {
      try {
        await sendBackForRevision()
        toast.success('Sent back for revision')
      } catch (error) {
        console.error('Send back error:', error)
        toast.error('Failed to send back for revision')
      }
    })
  }

  // Handle add from blueprint
  const handleAddFromBlueprint = async (
    blueprintId: string,
    tierName: string,
    tierPrice: number,
    features: string[]
  ) => {
    try {
      await addFromBlueprintTier(blueprintId, tierName, tierPrice, features)
      toast.success(`Added ${features.length} features from ${tierName}`)
    } catch (error) {
      console.error('Add blueprint error:', error)
      toast.error('Failed to add features')
    }
  }

  // Handle add custom
  const handleAddCustom = async (name: string, description: string) => {
    try {
      await createDeliverable(name, description)
      toast.success('Custom deliverable added')
    } catch (error) {
      console.error('Add custom error:', error)
      toast.error('Failed to add deliverable')
    }
  }

  // Render based on status
  if (deliverablesStatus === 'none') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Extract Deliverables
          </CardTitle>
          <CardDescription>
            Use AI to extract deliverables from your proposal, or add them manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button onClick={handleParse} disabled={isParsing || !proposalContent}>
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract from Proposal
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowAddModal(true)}>
              Add Manually
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (deliverablesStatus === 'parsing') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            Extracting deliverables from proposal...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <StatusBanner
        status={deliverablesStatus}
        pendingCount={pendingCount}
        isAdmin={isAdmin}
        isDfyOwner={isDfyOwner}
      />

      {/* Deliverables table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Deliverables</CardTitle>
            <Badge variant="outline">{deliverables.length} items</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <DeliverablesTable
            deliverables={deliverables}
            isEditable={isEditable}
            isReviewer={isReviewer}
            onUpdate={updateDeliverable}
            onRemove={removeDeliverable}
            onRevert={revertDeliverable}
            onReview={reviewDeliverable}
            onBulkApprove={bulkApprove}
            onAddDeliverable={isEditable ? () => setShowAddModal(true) : undefined}
          />
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3">
        {/* DFY Submit */}
        {canSubmit && (
          <ButtonHoldAndRelease
            onComplete={handleSubmit}
            holdDuration={2000}
            disabled={isSubmitting}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Changes for Review
          </ButtonHoldAndRelease>
        )}

        {/* DFY Withdraw */}
        {canWithdraw && (
          <Button variant="outline" onClick={handleWithdraw} disabled={isSubmitting}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Withdraw Submission
          </Button>
        )}

        {/* INT Actions */}
        {isAdmin && deliverablesStatus === 'int_reviewing' && (
          <>
            <Button variant="outline" onClick={handleSendBack} disabled={isSubmitting}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Send Back for Revision
            </Button>
            {canFinalApprove && (
              <ButtonHoldAndRelease
                onComplete={handleFinalApprove}
                holdDuration={2000}
                disabled={isSubmitting}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Final Approve & Lock
              </ButtonHoldAndRelease>
            )}
          </>
        )}
      </div>

      {/* Add deliverable modal */}
      <AddDeliverableModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        blueprints={blueprints}
        onAddFromBlueprint={handleAddFromBlueprint}
        onAddCustom={handleAddCustom}
      />
    </div>
  )
}

// Status banner component
function StatusBanner({
  status,
  pendingCount,
  isAdmin,
  isDfyOwner,
}: {
  status: DeliverablesNegotiationStatus
  pendingCount: number
  isAdmin: boolean
  isDfyOwner: boolean
}) {
  switch (status) {
    case 'dfy_editing':
      return isDfyOwner ? (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Edit Mode</AlertTitle>
          <AlertDescription>
            Review and modify the deliverables, then submit for internal review.
          </AlertDescription>
        </Alert>
      ) : null

    case 'dfy_submitted':
      return (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertTitle>Awaiting Review</AlertTitle>
          <AlertDescription>
            {isDfyOwner
              ? 'Your changes have been submitted and are awaiting internal review.'
              : 'DFY partner has submitted changes for review.'}
          </AlertDescription>
        </Alert>
      )

    case 'int_reviewing':
      return isAdmin ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Review Mode</AlertTitle>
          <AlertDescription>
            {pendingCount > 0
              ? `${pendingCount} items need your review. Accept, reject, or counter each change.`
              : 'All items reviewed. You can now approve and lock the deliverables.'}
          </AlertDescription>
        </Alert>
      ) : null

    case 'needs_revision':
      return isDfyOwner ? (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Revision Requested</AlertTitle>
          <AlertDescription>
            Some changes need revision. Please review the feedback and resubmit.
          </AlertDescription>
        </Alert>
      ) : null

    case 'approved':
      return (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Approved & Locked</AlertTitle>
          <AlertDescription>
            Deliverables have been finalized and locked. Ready for project conversion.
          </AlertDescription>
        </Alert>
      )

    default:
      return null
  }
}

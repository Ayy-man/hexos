'use server'

import { revalidatePath } from 'next/cache'
import {
  createProposalDeliverable,
  updateProposalDeliverable,
  deleteProposalDeliverable,
  markDeliverableRemoved,
  revertDeliverable,
  reviewDeliverable,
  bulkApproveDeliverables,
  bulkCreateDeliverablesFromAI,
  bulkCreateFromBlueprintTier,
  addDeliverableComment,
  deleteDeliverableComment,
  type CreateDeliverableInput,
  type UpdateDeliverableInput,
  type ProposalDeliverable,
  type DeliverableComment,
} from '@/lib/api/proposal-deliverables'
import { updateDeliverablesStatus, type DeliverablesNegotiationStatus } from '@/lib/api/inquiries'

// ============================================
// AI Parsing Actions
// ============================================

export async function triggerParseDeliverablesAction(
  inquiryId: string,
  proposalContent: unknown
): Promise<ProposalDeliverable[]> {
  // Update status to parsing
  await updateDeliverablesStatus(inquiryId, 'parsing')

  try {
    // Build absolute URL - server-side fetch requires full URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

    if (!baseUrl) {
      throw new Error('App URL not configured - set NEXT_PUBLIC_APP_URL or VERCEL_URL')
    }

    // Call the parse API
    const response = await fetch(`${baseUrl}/api/parse-deliverables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalContent }),
    })

    if (!response.ok) {
      throw new Error('Failed to parse deliverables')
    }

    const data = await response.json()

    if (!data.success || !data.deliverables?.length) {
      throw new Error('No deliverables extracted')
    }

    // Create the deliverables in the database
    const deliverables = await bulkCreateDeliverablesFromAI(
      inquiryId,
      data.deliverables
    )

    // Update status to dfy_editing
    await updateDeliverablesStatus(inquiryId, 'dfy_editing')

    revalidatePath(`/inquiries/${inquiryId}`)

    return deliverables
  } catch (error) {
    // Reset status on error
    await updateDeliverablesStatus(inquiryId, 'none')
    throw error
  }
}

// ============================================
// CRUD Actions
// ============================================

export async function createDeliverableAction(
  input: CreateDeliverableInput
): Promise<ProposalDeliverable> {
  const deliverable = await createProposalDeliverable(input)
  revalidatePath(`/inquiries/${input.inquiry_id}`)
  return deliverable
}

export async function updateDeliverableAction(
  deliverableId: string,
  inquiryId: string,
  input: UpdateDeliverableInput
): Promise<ProposalDeliverable> {
  const deliverable = await updateProposalDeliverable(deliverableId, input)
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverable
}

export async function deleteDeliverableAction(
  deliverableId: string,
  inquiryId: string
): Promise<void> {
  await deleteProposalDeliverable(deliverableId)
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function markDeliverableRemovedAction(
  deliverableId: string,
  inquiryId: string
): Promise<ProposalDeliverable> {
  const deliverable = await markDeliverableRemoved(deliverableId)
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverable
}

export async function revertDeliverableAction(
  deliverableId: string,
  inquiryId: string
): Promise<ProposalDeliverable> {
  const deliverable = await revertDeliverable(deliverableId)
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverable
}

// ============================================
// Blueprint Tier Actions
// ============================================

export async function addFromBlueprintTierAction(
  inquiryId: string,
  blueprintId: string,
  tierName: string,
  tierPrice: number,
  features: string[]
): Promise<ProposalDeliverable[]> {
  const deliverables = await bulkCreateFromBlueprintTier(
    inquiryId,
    blueprintId,
    tierName,
    tierPrice,
    features
  )
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverables
}

// ============================================
// Workflow Actions (DFY)
// ============================================

export async function submitDeliverablesForReviewAction(
  inquiryId: string
): Promise<void> {
  await updateDeliverablesStatus(inquiryId, 'dfy_submitted')
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function withdrawDeliverablesSubmissionAction(
  inquiryId: string
): Promise<void> {
  await updateDeliverablesStatus(inquiryId, 'dfy_editing')
  revalidatePath(`/inquiries/${inquiryId}`)
}

// ============================================
// Review Actions (INT)
// ============================================

export async function startReviewAction(inquiryId: string): Promise<void> {
  await updateDeliverablesStatus(inquiryId, 'int_reviewing')
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function reviewDeliverableAction(
  deliverableId: string,
  inquiryId: string,
  decision: 'approved' | 'rejected' | 'countered',
  counterPrice?: number,
  counterNote?: string
): Promise<ProposalDeliverable> {
  const deliverable = await reviewDeliverable(
    deliverableId,
    decision,
    counterPrice,
    counterNote
  )
  revalidatePath(`/inquiries/${inquiryId}`)
  return deliverable
}

export async function bulkApproveDeliverablesAction(
  deliverableIds: string[],
  inquiryId: string
): Promise<void> {
  await bulkApproveDeliverables(deliverableIds)
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function finalApproveDeliverablesAction(
  inquiryId: string
): Promise<void> {
  await updateDeliverablesStatus(inquiryId, 'approved')
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function sendBackForRevisionAction(
  inquiryId: string
): Promise<void> {
  await updateDeliverablesStatus(inquiryId, 'needs_revision')
  revalidatePath(`/inquiries/${inquiryId}`)
}

// ============================================
// Comment Actions
// ============================================

export async function addDeliverableCommentAction(
  deliverableId: string,
  inquiryId: string,
  content: string
): Promise<DeliverableComment> {
  const comment = await addDeliverableComment(deliverableId, content)
  revalidatePath(`/inquiries/${inquiryId}`)
  return comment
}

export async function deleteDeliverableCommentAction(
  commentId: string,
  inquiryId: string
): Promise<void> {
  await deleteDeliverableComment(commentId)
  revalidatePath(`/inquiries/${inquiryId}`)
}

// ============================================
// Status Update Action
// ============================================

export async function updateDeliverablesStatusAction(
  inquiryId: string,
  status: DeliverablesNegotiationStatus
): Promise<void> {
  await updateDeliverablesStatus(inquiryId, status)
  revalidatePath(`/inquiries/${inquiryId}`)
}

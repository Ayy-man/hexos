'use server'

import { revalidatePath } from 'next/cache'
import {
  createProposalDeliverable,
  updateProposalDeliverable,
  deleteProposalDeliverable,
  getProposalDeliverablesTree,
  type ProposalDeliverable,
  type ProposalDeliverableWithChildren,
} from '@/lib/api/proposal-deliverables'
import { triggerParseDeliverablesAction } from '@/features/inquiries/actions/deliverableActions'
import { getInquiry } from '@/lib/api/inquiries'

// ============================================
// AI Extraction
// ============================================

export async function extractDeliverablesFromProposalAction(
  inquiryId: string
): Promise<{ success: boolean; tree?: ProposalDeliverableWithChildren[]; error?: string }> {
  try {
    // Get the inquiry to access proposal content
    const inquiry = await getInquiry(inquiryId)

    if (!inquiry) {
      return { success: false, error: 'Inquiry not found' }
    }

    if (!inquiry.proposal_content) {
      return { success: false, error: 'No proposal content found. Admin must write a proposal first.' }
    }

    // Call the existing AI extraction function
    await triggerParseDeliverablesAction(inquiryId, inquiry.proposal_content)

    // Fetch the updated tree
    const tree = await getProposalDeliverablesTree(inquiryId)

    revalidatePath(`/inquiries/${inquiryId}/initiate`)
    revalidatePath(`/inquiries/${inquiryId}`)

    return { success: true, tree }
  } catch (error) {
    console.error('[extractDeliverablesFromProposal] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract deliverables'
    }
  }
}

// ============================================
// CRUD Actions
// ============================================

export async function addDeliverableAction(
  inquiryId: string,
  name: string,
  description?: string,
  price?: number,
  parentId?: string
): Promise<{ success: boolean; deliverable?: ProposalDeliverable; tree?: ProposalDeliverableWithChildren[]; error?: string }> {
  try {
    const deliverable = await createProposalDeliverable({
      inquiry_id: inquiryId,
      name,
      description,
      price,
      parent_id: parentId,
      source: 'custom',
    })

    // Fetch the updated tree
    const tree = await getProposalDeliverablesTree(inquiryId)

    revalidatePath(`/inquiries/${inquiryId}/initiate`)

    return { success: true, deliverable, tree }
  } catch (error) {
    console.error('[addDeliverable] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add deliverable'
    }
  }
}

export async function updateDeliverableAction(
  deliverableId: string,
  inquiryId: string,
  data: {
    name?: string
    description?: string
    price?: number
    parentId?: string | null
  }
): Promise<{ success: boolean; deliverable?: ProposalDeliverable; tree?: ProposalDeliverableWithChildren[]; error?: string }> {
  try {
    const deliverable = await updateProposalDeliverable(deliverableId, {
      name: data.name,
      description: data.description,
      price: data.price,
      parent_id: data.parentId,
    })

    // Fetch the updated tree
    const tree = await getProposalDeliverablesTree(inquiryId)

    revalidatePath(`/inquiries/${inquiryId}/initiate`)

    return { success: true, deliverable, tree }
  } catch (error) {
    console.error('[updateDeliverable] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update deliverable'
    }
  }
}

export async function deleteDeliverableAction(
  deliverableId: string,
  inquiryId: string
): Promise<{ success: boolean; tree?: ProposalDeliverableWithChildren[]; error?: string }> {
  try {
    await deleteProposalDeliverable(deliverableId)

    // Fetch the updated tree
    const tree = await getProposalDeliverablesTree(inquiryId)

    revalidatePath(`/inquiries/${inquiryId}/initiate`)

    return { success: true, tree }
  } catch (error) {
    console.error('[deleteDeliverable] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete deliverable'
    }
  }
}

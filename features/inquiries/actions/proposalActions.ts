'use server'

import { revalidatePath } from 'next/cache'
import {
  updateInquiryProposal,
  submitProposalToDfy,
  unsubmitProposalFromDfy,
  updateDfyVersion,
  copyProposalToDfyVersion,
  updateInquiryStage,
} from '@/lib/api/inquiries'
import {
  createInquiryComment,
  resolveInquiryComment,
  deleteInquiryComment,
  type InquiryComment,
} from '@/lib/api/inquiry-comments'

// Save proposal content (auto-save, no revalidate)
export async function saveProposalContentAction(
  inquiryId: string,
  content: unknown,
  discussions: unknown
): Promise<void> {
  try {
    await updateInquiryProposal(inquiryId, content, discussions)
    // Don't revalidate on auto-save to avoid unnecessary re-renders
  } catch (error) {
    console.warn('Failed to save proposal:', error)
    throw error
  }
}

// Submit proposal to DFY partner
export async function submitProposalAction(inquiryId: string): Promise<void> {
  await submitProposalToDfy(inquiryId)
  revalidatePath(`/inquiries/${inquiryId}`)
}

// Unsubmit proposal (undo send) - admin only
export async function unsubmitProposalAction(inquiryId: string): Promise<void> {
  await unsubmitProposalFromDfy(inquiryId)
  revalidatePath(`/inquiries/${inquiryId}`)
}

// Submit proposal for internal review (moves to final_review stage)
export async function submitForReviewAction(inquiryId: string): Promise<void> {
  await updateInquiryStage(inquiryId, 'final_review', 'Submitted for internal review')
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
}

// Approve proposal (moves from final_review to ready stage)
export async function approveProposalAction(inquiryId: string): Promise<void> {
  await updateInquiryStage(inquiryId, 'ready', 'Proposal approved and ready for partner')
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
}

// Save DFY's private version (auto-save, no revalidate)
export async function saveDfyVersionAction(
  inquiryId: string,
  content: unknown
): Promise<void> {
  try {
    await updateDfyVersion(inquiryId, content)
    // Don't revalidate on auto-save
  } catch (error) {
    console.warn('Failed to save DFY version:', error)
    throw error
  }
}

// Copy proposal to DFY version
export async function copyProposalToDfyVersionAction(
  inquiryId: string
): Promise<void> {
  await copyProposalToDfyVersion(inquiryId)
  revalidatePath(`/inquiries/${inquiryId}`)
}

// Add comment on proposal
export async function addProposalComment(
  inquiryId: string,
  content: string,
  parentId?: string
): Promise<InquiryComment> {
  const comment = await createInquiryComment({
    inquiry_id: inquiryId,
    content,
    comment_type: 'proposal',
    parent_id: parentId || null,
  })
  revalidatePath(`/inquiries/${inquiryId}`)
  return comment
}

// Resolve proposal comment
export async function resolveProposalCommentAction(
  inquiryId: string,
  commentId: string,
  resolved: boolean
): Promise<void> {
  await resolveInquiryComment(commentId, resolved)
  revalidatePath(`/inquiries/${inquiryId}`)
}

// Delete proposal comment
export async function deleteProposalCommentAction(
  inquiryId: string,
  commentId: string
): Promise<void> {
  await deleteInquiryComment(commentId)
  revalidatePath(`/inquiries/${inquiryId}`)
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  archiveInquiry,
  unarchiveInquiry,
  deleteInquiry,
  restoreInquiry,
  updateInquiryStatus,
  updateInquiryStage,
  updateInquiryPriority,
  updateInquiryDueDate,
  assignInquiry,
  updateInquiryEstimatedValue,
  bulkUpdateInquiryStage,
  type ProposalStage,
  type Priority,
} from '@/lib/api/inquiries'

export async function archiveInquiryAction(inquiryId: string): Promise<void> {
  await archiveInquiry(inquiryId)
  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function unarchiveInquiryAction(inquiryId: string): Promise<void> {
  await unarchiveInquiry(inquiryId)
  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function deleteInquiryAction(inquiryId: string): Promise<void> {
  await deleteInquiry(inquiryId)
  revalidatePath('/inquiries')
  redirect('/inquiries')
}

export async function restoreInquiryAction(inquiryId: string): Promise<void> {
  await restoreInquiry(inquiryId)
  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function updateInquiryStatusAction(
  inquiryId: string,
  status: string
): Promise<void> {
  await updateInquiryStatus(inquiryId, status)
  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${inquiryId}`)
}

// Proposal stage management actions
export async function updateStageAction(
  id: string,
  stage: ProposalStage,
  notes?: string
): Promise<void> {
  await updateInquiryStage(id, stage, notes)
  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)
}

export async function updatePriorityAction(
  id: string,
  priority: Priority
): Promise<void> {
  await updateInquiryPriority(id, priority)
  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)
}

export async function updateDueDateAction(
  id: string,
  dueDate: Date | null
): Promise<void> {
  await updateInquiryDueDate(id, dueDate)
  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)
}

export async function assignInquiryAction(
  id: string,
  userId: string | null
): Promise<void> {
  await assignInquiry(id, userId)
  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)
}

export async function updateEstimatedValueAction(
  id: string,
  value: number | null
): Promise<void> {
  await updateInquiryEstimatedValue(id, value)
  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)
}

export async function bulkUpdateStageAction(
  ids: string[],
  stage: ProposalStage
): Promise<void> {
  await bulkUpdateInquiryStage(ids, stage)
  revalidatePath('/inquiries')
}

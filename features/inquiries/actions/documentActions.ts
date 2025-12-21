'use server'

import { revalidatePath } from 'next/cache'
import { updateInquiryDocument } from '@/lib/api/inquiries'
import {
  createInquiryComment,
  resolveInquiryComment,
  deleteInquiryComment,
  type InquiryComment,
} from '@/lib/api/inquiry-comments'

export async function saveInquiryDocument(
  inquiryId: string,
  content: unknown
): Promise<void> {
  await updateInquiryDocument(inquiryId, content)
  // Don't revalidate on auto-save to avoid unnecessary re-renders
}

export async function addInquiryComment(
  inquiryId: string,
  content: string,
  parentId?: string
): Promise<InquiryComment> {
  const comment = await createInquiryComment({
    inquiry_id: inquiryId,
    content,
    parent_id: parentId || null,
  })
  revalidatePath(`/inquiries/${inquiryId}`)
  return comment
}

export async function resolveInquiryCommentAction(
  inquiryId: string,
  commentId: string,
  resolved: boolean
): Promise<void> {
  await resolveInquiryComment(commentId, resolved)
  revalidatePath(`/inquiries/${inquiryId}`)
}

export async function deleteInquiryCommentAction(
  inquiryId: string,
  commentId: string
): Promise<void> {
  await deleteInquiryComment(commentId)
  revalidatePath(`/inquiries/${inquiryId}`)
}

'use server'

import { revalidatePath } from 'next/cache'
import { updateInquiryDocument } from '@/lib/api/inquiries'
import {
  createInquiryComment,
  resolveInquiryComment,
  deleteInquiryComment,
  type InquiryComment,
  type CommentType,
} from '@/lib/api/inquiry-comments'

export async function saveInquiryDocument(
  inquiryId: string,
  content: unknown
): Promise<void> {
  try {
    await updateInquiryDocument(inquiryId, content)
    // Don't revalidate on auto-save to avoid unnecessary re-renders
  } catch (error) {
    // document_content column may not exist yet - silently fail
    console.warn('Failed to save document:', error)
  }
}

export async function saveInquiryDocumentWithDiscussions(
  inquiryId: string,
  content: unknown,
  discussions: unknown
): Promise<void> {
  try {
    await updateInquiryDocument(inquiryId, content, discussions)
    // Don't revalidate on auto-save to avoid unnecessary re-renders
  } catch (error) {
    // Columns may not exist yet - silently fail
    console.warn('Failed to save document with discussions:', error)
  }
}

export async function addInquiryComment(
  inquiryId: string,
  content: string,
  commentType: CommentType = 'internal',
  parentId?: string
): Promise<InquiryComment> {
  const comment = await createInquiryComment({
    inquiry_id: inquiryId,
    content,
    comment_type: commentType,
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

'use server'

import { updateInquiryDocument } from '@/lib/api/inquiries'

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

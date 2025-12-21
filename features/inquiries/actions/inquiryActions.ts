'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  archiveInquiry,
  unarchiveInquiry,
  deleteInquiry,
  restoreInquiry,
  updateInquiryStatus,
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

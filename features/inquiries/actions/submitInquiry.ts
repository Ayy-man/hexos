'use server'

import { createInquiry } from '@/lib/api/inquiries'
import type { CreateInquiryData } from '@/features/inquiries/types'
import { revalidatePath } from 'next/cache'

export async function submitInquiry(data: CreateInquiryData) {
  const inquiry = await createInquiry(data)
  revalidatePath('/inquiries')
  return inquiry
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  markInquiryAsClosed,
  unmarkInquiryAsClosed,
  convertInquiryToProjectFull,
  type ConvertToProjectInput,
} from '@/lib/api/inquiries'

// ============================================
// Mark as Closed Actions (DFY)
// ============================================

export async function markAsClosedAction(
  inquiryId: string,
  notes?: string,
  clientEmail?: string
): Promise<void> {
  await markInquiryAsClosed(inquiryId, notes, clientEmail)
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
}

export async function unmarkAsClosedAction(inquiryId: string): Promise<void> {
  await unmarkInquiryAsClosed(inquiryId)
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
}

// ============================================
// Project Conversion Actions (INT)
// ============================================

export async function convertToProjectAction(
  inquiryId: string,
  projectData: ConvertToProjectInput,
  deliverableIds: string[],
  requirements: Array<{ title: string; description?: string }>
): Promise<{ projectId: string }> {
  const project = await convertInquiryToProjectFull(
    inquiryId,
    projectData,
    deliverableIds,
    requirements
  )

  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
  revalidatePath('/projects')

  return { projectId: project.id }
}

// Action that redirects to the new project after conversion
export async function convertAndRedirectAction(
  inquiryId: string,
  projectData: ConvertToProjectInput,
  deliverableIds: string[],
  requirements: Array<{ title: string; description?: string }>
): Promise<never> {
  const project = await convertInquiryToProjectFull(
    inquiryId,
    projectData,
    deliverableIds,
    requirements
  )

  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
  revalidatePath('/projects')
  revalidatePath(`/projects/${project.id}`)

  redirect(`/projects/${project.id}`)
}

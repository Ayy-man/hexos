'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  duplicateCaseStudy,
  uploadCaseStudyImage,
  type CreateCaseStudyInput,
  type UpdateCaseStudyInput,
} from '@/lib/api/case-studies'

export async function uploadCaseStudyImageAction(formData: FormData): Promise<string> {
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')
  return uploadCaseStudyImage(file)
}

export async function createCaseStudyAction(input: CreateCaseStudyInput) {
  const caseStudy = await createCaseStudy(input)
  revalidatePath('/case-studies')
  redirect(`/case-studies/${caseStudy.id}`)
}

export async function updateCaseStudyAction(id: string, input: UpdateCaseStudyInput) {
  await updateCaseStudy(id, input)
  revalidatePath('/case-studies')
  revalidatePath(`/case-studies/${id}`)
}

export async function updateCaseStudyContentAction(id: string, content: unknown) {
  await updateCaseStudy(id, { content })
  // Don't revalidate path on content save - it's auto-saved frequently
}

export async function deleteCaseStudyAction(id: string) {
  await deleteCaseStudy(id)
  revalidatePath('/case-studies')
  redirect('/case-studies')
}

export async function publishCaseStudyAction(id: string) {
  await updateCaseStudy(id, { status: 'published' })
  revalidatePath('/case-studies')
  revalidatePath(`/case-studies/${id}`)
}

export async function unpublishCaseStudyAction(id: string) {
  await updateCaseStudy(id, { status: 'draft' })
  revalidatePath('/case-studies')
  revalidatePath(`/case-studies/${id}`)
}

export async function duplicateCaseStudyAction(id: string) {
  const newCaseStudy = await duplicateCaseStudy(id)
  revalidatePath('/case-studies')
  redirect(`/case-studies/${newCaseStudy.id}?edit=true`)
}

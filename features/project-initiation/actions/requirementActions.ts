'use server'

import { revalidatePath } from 'next/cache'
import {
  createOnboardingRequirement,
  updateOnboardingRequirement,
  deleteOnboardingRequirement,
  bulkCreateOnboardingRequirements,
  reorderOnboardingRequirements,
  markRequirementComplete,
  type CreateOnboardingRequirementInput,
  type UpdateOnboardingRequirementInput,
  type OnboardingRequirement,
  type RequirementOwner,
  type RequirementBlocker,
} from '@/lib/api/onboarding-requirements'
import {
  uploadRequirementAttachment,
  deleteRequirementAttachment,
  type RequirementAttachment,
} from '@/lib/api/requirement-attachments'

// ============================================
// Requirement CRUD Actions
// ============================================

export async function createRequirementAction(
  input: CreateOnboardingRequirementInput
): Promise<OnboardingRequirement> {
  const requirement = await createOnboardingRequirement(input)
  revalidatePath(`/projects/${input.project_id}`)
  return requirement
}

export async function updateRequirementAction(
  id: string,
  projectId: string,
  input: UpdateOnboardingRequirementInput
): Promise<OnboardingRequirement> {
  const requirement = await updateOnboardingRequirement(id, input)
  revalidatePath(`/projects/${projectId}`)
  return requirement
}

export async function deleteRequirementAction(
  id: string,
  projectId: string
): Promise<void> {
  await deleteOnboardingRequirement(id)
  revalidatePath(`/projects/${projectId}`)
}

export async function bulkCreateRequirementsAction(
  projectId: string,
  requirements: Array<{
    parent_id?: string | null
    title: string
    description?: string
    notes?: string
    owner_type?: RequirementOwner
    blocker_type?: RequirementBlocker
    loom_url?: string
    resource_url?: string
    position?: number
  }>
): Promise<OnboardingRequirement[]> {
  const created = await bulkCreateOnboardingRequirements(projectId, requirements)
  revalidatePath(`/projects/${projectId}`)
  return created
}

export async function reorderRequirementsAction(
  projectId: string,
  updates: Array<{ id: string; position: number; parent_id?: string | null }>
): Promise<void> {
  await reorderOnboardingRequirements(updates)
  revalidatePath(`/projects/${projectId}`)
}

export async function markRequirementCompleteAction(
  id: string,
  projectId: string
): Promise<OnboardingRequirement> {
  const requirement = await markRequirementComplete(id)
  revalidatePath(`/projects/${projectId}`)
  return requirement
}

// ============================================
// Attachment Actions
// ============================================

export async function uploadAttachmentAction(
  requirementId: string,
  projectId: string,
  formData: FormData
): Promise<RequirementAttachment> {
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')

  const attachment = await uploadRequirementAttachment(requirementId, file, projectId)
  revalidatePath(`/projects/${projectId}`)
  return attachment
}

export async function deleteAttachmentAction(
  attachmentId: string,
  projectId: string
): Promise<void> {
  await deleteRequirementAttachment(attachmentId)
  revalidatePath(`/projects/${projectId}`)
}

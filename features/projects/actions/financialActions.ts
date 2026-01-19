'use server'

import { revalidatePath } from 'next/cache'
import { updateProjectFinancials, type UpdateProjectFinancialsInput } from '@/lib/api/projects'
import { requireAuth, getProfile } from '@/lib/auth/guards'

// Update project financial fields (admin only)
export async function updateProjectFinancialsAction(
  projectId: string,
  input: UpdateProjectFinancialsInput
): Promise<void> {
  await requireAuth()
  const profile = await getProfile()

  // Only admin can edit financials
  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized: Admin only')
  }

  await updateProjectFinancials(projectId, input)
  revalidatePath(`/projects/${projectId}`)
}

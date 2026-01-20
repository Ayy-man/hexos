'use server'

import { revalidatePath } from 'next/cache'
import {
  updateCommitmentStatus,
  removeCommitment,
  type CommitmentStatus,
  type DevOpportunityPreference,
} from '@/lib/api/project-invitations'

const VALID_STATUSES: CommitmentStatus[] = ['interested', 'committed', 'declined', null]

/**
 * Set commitment status for an opportunity
 */
export async function setCommitmentStatusAction(params: {
  opportunityId: string
  status: CommitmentStatus
  note?: string
}): Promise<{ success: true; preference: DevOpportunityPreference } | { success: false; message: string }> {
  try {
    // Validate status
    if (!VALID_STATUSES.includes(params.status)) {
      return { success: false, message: 'Invalid commitment status' }
    }

    const preference = await updateCommitmentStatus(
      params.opportunityId,
      params.status,
      params.note
    )

    revalidatePath('/dashboard/dev')
    revalidatePath('/dashboard/dev/opportunities')
    revalidatePath(`/opportunities/${params.opportunityId}`)

    return { success: true, preference }
  } catch (error) {
    console.error('Error setting commitment status:', error)
    return { success: false, message: 'Failed to update commitment status' }
  }
}

/**
 * Remove commitment from an opportunity
 */
export async function removeCommitmentAction(
  opportunityId: string
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    await removeCommitment(opportunityId)

    revalidatePath('/dashboard/dev')
    revalidatePath('/dashboard/dev/opportunities')
    revalidatePath(`/opportunities/${opportunityId}`)

    return { success: true }
  } catch (error) {
    console.error('Error removing commitment:', error)
    return { success: false, message: 'Failed to remove commitment' }
  }
}

/**
 * Toggle interest status for quick interaction
 * - If null/declined -> set to 'interested'
 * - If 'interested' -> remove commitment
 * - If 'committed' -> no action (must explicitly remove)
 */
export async function toggleInterestAction(
  opportunityId: string,
  currentStatus: CommitmentStatus
): Promise<{ success: true; preference?: DevOpportunityPreference } | { success: false; message: string }> {
  try {
    // If committed, don't toggle - must explicitly clear
    if (currentStatus === 'committed') {
      return { success: false, message: 'Cannot toggle committed status. Please clear commitment first.' }
    }

    // If interested, remove commitment
    if (currentStatus === 'interested') {
      await removeCommitment(opportunityId)
      revalidatePath('/dashboard/dev')
      revalidatePath('/dashboard/dev/opportunities')
      revalidatePath(`/opportunities/${opportunityId}`)
      return { success: true }
    }

    // If null or declined, set to interested
    const preference = await updateCommitmentStatus(opportunityId, 'interested')

    revalidatePath('/dashboard/dev')
    revalidatePath('/dashboard/dev/opportunities')
    revalidatePath(`/opportunities/${opportunityId}`)

    return { success: true, preference }
  } catch (error) {
    console.error('Error toggling interest:', error)
    return { success: false, message: 'Failed to toggle interest' }
  }
}

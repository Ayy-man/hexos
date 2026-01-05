'use server'

import { revalidatePath } from 'next/cache'
import {
  acceptInvitation,
  declineInvitation,
  applyToOpportunity,
  updateMyAvailability,
  type ProjectComplexity,
} from '@/lib/api/project-invitations'

export async function acceptInvitationAction(invitationId: string, message?: string) {
  try {
    const invitation = await acceptInvitation(invitationId, message)
    revalidatePath('/dashboard/dev')
    revalidatePath('/opportunities')
    return { success: true, invitation }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return { success: false, message: 'Failed to accept invitation' }
  }
}

export async function declineInvitationAction(invitationId: string, message?: string) {
  try {
    const invitation = await declineInvitation(invitationId, message)
    revalidatePath('/dashboard/dev')
    revalidatePath('/opportunities')
    return { success: true, invitation }
  } catch (error) {
    console.error('Error declining invitation:', error)
    return { success: false, message: 'Failed to decline invitation' }
  }
}

export async function applyToOpportunityAction(params: {
  opportunityId: string
  coverMessage?: string
  estimatedCompletion?: string
}) {
  try {
    const application = await applyToOpportunity(params)
    revalidatePath('/opportunities')
    revalidatePath('/dashboard/dev')
    return { success: true, application }
  } catch (error) {
    console.error('Error applying to opportunity:', error)
    return { success: false, message: 'Failed to submit application' }
  }
}

export async function updateAvailabilityAction(updates: {
  is_available?: boolean
  available_hours_per_week?: number
  available_from?: string
  preferred_complexity?: ProjectComplexity[]
  preferred_project_types?: string[]
  min_hours_per_project?: number
  max_hours_per_project?: number
  headline?: string
  portfolio_url?: string
}) {
  try {
    const availability = await updateMyAvailability(updates)
    revalidatePath('/dashboard/dev')
    revalidatePath('/settings/availability')
    return { success: true, availability }
  } catch (error) {
    console.error('Error updating availability:', error)
    return { success: false, message: 'Failed to update availability' }
  }
}

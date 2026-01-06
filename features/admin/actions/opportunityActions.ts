'use server'

import { revalidatePath } from 'next/cache'
import {
  createOpportunity,
  sendInvitation,
  publishOpportunity,
  closeOpportunity,
  type ProjectComplexity,
} from '@/lib/api/project-invitations'

export async function createOpportunityAction(params: {
  title: string
  description?: string
  projectId?: string | null
  estimatedHours?: number | null
  complexity?: ProjectComplexity
  expiresAt?: string
}) {
  try {
    const opportunity = await createOpportunity({
      title: params.title,
      description: params.description,
      projectId: params.projectId || undefined,
      estimatedHours: params.estimatedHours || undefined,
      complexity: params.complexity || 'medium',
      expiresAt: params.expiresAt,
    })

    revalidatePath('/admin/opportunities')
    return { success: true, opportunity }
  } catch (error) {
    console.error('Error creating opportunity:', error)
    const message = error instanceof Error ? error.message : 'Failed to create opportunity'
    return { success: false, message }
  }
}

export async function sendInvitationAction(params: {
  opportunityId?: string
  projectId: string
  devId: string
  message?: string
}) {
  try {
    const invitation = await sendInvitation({
      projectId: params.projectId,
      devId: params.devId,
      opportunityId: params.opportunityId,
      message: params.message,
    })

    revalidatePath('/admin/opportunities')
    return { success: true, invitation }
  } catch (error) {
    console.error('Error sending invitation:', error)
    return { success: false, message: 'Failed to send invitation' }
  }
}

export async function publishOpportunityAction(opportunityId: string) {
  try {
    const opportunity = await publishOpportunity(opportunityId)
    revalidatePath('/admin/opportunities')
    return { success: true, opportunity }
  } catch (error) {
    console.error('Error publishing opportunity:', error)
    return { success: false, message: 'Failed to publish opportunity' }
  }
}

export async function closeOpportunityAction(opportunityId: string, filled: boolean = false) {
  try {
    const opportunity = await closeOpportunity(opportunityId, filled)
    revalidatePath('/admin/opportunities')
    return { success: true, opportunity }
  } catch (error) {
    console.error('Error closing opportunity:', error)
    return { success: false, message: 'Failed to close opportunity' }
  }
}

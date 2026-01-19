'use server'

import { revalidatePath } from 'next/cache'
import {
  toggleOpportunityStar,
  toggleOpportunityHide,
} from '@/lib/api/project-invitations'

export async function toggleStarAction(opportunityId: string) {
  try {
    const isStarred = await toggleOpportunityStar(opportunityId)
    revalidatePath('/dashboard/dev')
    return { success: true, isStarred }
  } catch (error) {
    console.error('Error toggling star:', error)
    return { success: false, message: 'Failed to update star status' }
  }
}

export async function toggleHideAction(opportunityId: string) {
  try {
    const isHidden = await toggleOpportunityHide(opportunityId)
    revalidatePath('/dashboard/dev')
    return { success: true, isHidden }
  } catch (error) {
    console.error('Error toggling hide:', error)
    return { success: false, message: 'Failed to update hide status' }
  }
}

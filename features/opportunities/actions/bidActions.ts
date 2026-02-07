'use server'

import { revalidatePath } from 'next/cache'
import {
  submitBid,
  withdrawBid,
  updateBidStatus,
  getBidsForOpportunity,
  type BidStatus,
  type DevOpportunityBid,
} from '@/lib/api/bids'

// ============================================
// Bid Submission Actions (Dev)
// ============================================

export async function submitBidAction(params: {
  opportunityId: string
  proposedWeeks: number
  proposedPrice?: number
  coverMessage?: string
}): Promise<DevOpportunityBid> {
  try {
    const bid = await submitBid({
      opportunityId: params.opportunityId,
      proposedWeeks: params.proposedWeeks,
      proposedPrice: params.proposedPrice,
      coverMessage: params.coverMessage,
    })

    // Revalidate dev and admin opportunity views
    revalidatePath('/dashboard/dev/opportunities')
    revalidatePath('/admin/opportunities')
    revalidatePath(`/admin/opportunities/${params.opportunityId}`)

    return bid
  } catch (error) {
    console.error('[submitBidAction] Error:', error)
    throw error
  }
}

// ============================================
// Bid Withdrawal Actions (Dev)
// ============================================

export async function withdrawBidAction(
  bidId: string,
  opportunityId: string
): Promise<void> {
  try {
    await withdrawBid(bidId)

    // Revalidate dev and admin opportunity views
    revalidatePath('/dashboard/dev/opportunities')
    revalidatePath('/admin/opportunities')
    revalidatePath(`/admin/opportunities/${opportunityId}`)
  } catch (error) {
    console.error('[withdrawBidAction] Error:', error)
    throw error
  }
}

// ============================================
// Bid Review Actions (Admin)
// ============================================

export async function updateBidStatusAction(
  bidId: string,
  opportunityId: string,
  status: BidStatus,
  notes?: string
): Promise<DevOpportunityBid> {
  try {
    const bid = await updateBidStatus(bidId, status, notes)

    // Revalidate dev and admin opportunity views
    revalidatePath('/dashboard/dev/opportunities')
    revalidatePath('/admin/opportunities')
    revalidatePath(`/admin/opportunities/${opportunityId}`)

    return bid
  } catch (error) {
    console.error('[updateBidStatusAction] Error:', error)
    throw error
  }
}

// ============================================
// Bid Query Actions
// ============================================

export async function getBidsForOpportunityAction(
  opportunityId: string
): Promise<DevOpportunityBid[]> {
  try {
    return await getBidsForOpportunity(opportunityId)
  } catch (error) {
    console.error('[getBidsForOpportunityAction] Error:', error)
    throw error
  }
}

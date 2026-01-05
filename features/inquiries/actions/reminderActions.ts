'use server'

import { revalidatePath } from 'next/cache'
import {
  snoozeReminder,
  markProposalLost,
  escalateToAdmin,
  clearEscalation,
  trackDfyProposalView,
  requestProposalUpdates,
} from '@/lib/api/proposal-reminders'
import { markInquiryAsClosed } from '@/lib/api/inquiries'

// ============================================
// Snooze Reminder (DFY)
// ============================================

export async function snoozeReminderAction(
  inquiryId: string
): Promise<{ success: boolean; message: string }> {
  const result = await snoozeReminder(inquiryId)
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
  revalidatePath('/dashboard/dfy')
  return result
}

// ============================================
// Mark as Lost (DFY)
// ============================================

export async function markLostAction(
  inquiryId: string,
  reason?: string
): Promise<void> {
  await markProposalLost(inquiryId, reason)
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
  revalidatePath('/dashboard/dfy')
}

// ============================================
// Mark as Won/Closed (DFY)
// Reuses existing markInquiryAsClosed
// ============================================

export async function markWonAction(
  inquiryId: string,
  notes?: string,
  clientEmail?: string
): Promise<void> {
  await markInquiryAsClosed(inquiryId, notes, clientEmail)
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
  revalidatePath('/dashboard/dfy')
}

// ============================================
// Request Admin Help (DFY)
// ============================================

export async function requestAdminHelpAction(inquiryId: string): Promise<void> {
  await escalateToAdmin(inquiryId)
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
  revalidatePath('/dashboard/dfy')
}

// ============================================
// Clear Escalation (Admin)
// ============================================

export async function clearEscalationAction(inquiryId: string): Promise<void> {
  await clearEscalation(inquiryId)
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
}

// ============================================
// Track DFY View (called when DFY views proposal)
// ============================================

export async function trackDfyViewAction(inquiryId: string): Promise<void> {
  await trackDfyProposalView(inquiryId)
  // No revalidation needed - this is just tracking
}

// ============================================
// Request Updates (Admin)
// Allows admin to request status updates for multiple proposals
// ============================================

export async function requestUpdatesAction(
  inquiryIds: string[]
): Promise<{ success: boolean; count: number; message: string }> {
  if (inquiryIds.length === 0) {
    return { success: false, count: 0, message: 'No proposals selected' }
  }

  const result = await requestProposalUpdates(inquiryIds)

  // Revalidate all relevant paths
  revalidatePath('/inquiries')
  revalidatePath('/dashboard/admin')

  return {
    success: result.success,
    count: result.count,
    message: `Update requested for ${result.count} proposal${result.count !== 1 ? 's' : ''}`,
  }
}

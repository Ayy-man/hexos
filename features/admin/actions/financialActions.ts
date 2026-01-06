'use server';

/**
 * Server Actions for Financial Metrics
 *
 * Admin-only actions for financial dashboard and payment management
 */

import { revalidatePath } from 'next/cache';
import {
  getFinancialHeroMetrics,
  getPaymentTimeline,
  getRevenueTrend,
  getOverduePayments,
  getSalesCycleStats,
  getProjectedRevenueTimeline,
  getPendingPaymentsByProject,
  createPaymentMilestones,
  markMilestoneAsPaid,
  updateMilestoneDueDate,
  getProjectPaymentMilestones,
} from '@/lib/api/financial-metrics';

type PaymentStructure = '100_upfront' | '50_50' | '40_30_30' | 'custom';

// ============================================================================
// HERO METRICS
// ============================================================================

export async function fetchFinancialHeroMetrics() {
  const metrics = await getFinancialHeroMetrics();
  return { success: true, data: metrics };
}

// ============================================================================
// PAYMENT TIMELINE
// ============================================================================

export async function fetchPaymentTimeline(months: number = 12) {
  const timeline = await getPaymentTimeline(months);
  return { success: true, data: timeline };
}

// ============================================================================
// REVENUE TREND
// ============================================================================

export async function fetchRevenueTrend(months: number = 12) {
  const trend = await getRevenueTrend(months);
  return { success: true, data: trend };
}

// ============================================================================
// OVERDUE PAYMENTS
// ============================================================================

export async function fetchOverduePayments() {
  const overdue = await getOverduePayments();
  return { success: true, data: overdue };
}

// ============================================================================
// SALES CYCLE STATS
// ============================================================================

export async function fetchSalesCycleStats() {
  const stats = await getSalesCycleStats();
  return { success: true, data: stats };
}

// ============================================================================
// PROJECTED REVENUE
// ============================================================================

export async function fetchProjectedRevenueTimeline() {
  const timeline = await getProjectedRevenueTimeline();
  return { success: true, data: timeline };
}

// ============================================================================
// PENDING PAYMENTS
// ============================================================================

export async function fetchPendingPaymentsByProject() {
  const pending = await getPendingPaymentsByProject();
  return { success: true, data: pending };
}

// ============================================================================
// PAYMENT MILESTONE MANAGEMENT
// ============================================================================

/**
 * Create payment milestones for a project
 */
export async function createProjectPaymentMilestones(
  projectId: string,
  priceDfy: number,
  paymentStructure: PaymentStructure,
  targetDeliveryDate: string
) {
  const result = await createPaymentMilestones(
    projectId,
    priceDfy,
    paymentStructure,
    targetDeliveryDate
  );

  if (result.success) {
    revalidatePath('/dashboard/admin');
    revalidatePath(`/projects/${projectId}`);
  }

  return result;
}

/**
 * Mark a payment milestone as paid
 */
export async function markPaymentMilestoneAsPaid(
  milestoneId: string,
  stripePaymentId?: string
) {
  const result = await markMilestoneAsPaid(
    milestoneId,
    new Date().toISOString(),
    stripePaymentId
  );

  if (result.success) {
    revalidatePath('/dashboard/admin');
  }

  return result;
}

/**
 * Update payment milestone due date
 */
export async function updatePaymentMilestoneDueDate(
  milestoneId: string,
  dueDate: string
) {
  const result = await updateMilestoneDueDate(milestoneId, dueDate);

  if (result.success) {
    revalidatePath('/dashboard/admin');
  }

  return result;
}

/**
 * Fetch payment milestones for a project
 */
export async function fetchProjectPaymentMilestones(projectId: string) {
  const milestones = await getProjectPaymentMilestones(projectId);
  return { success: true, data: milestones };
}

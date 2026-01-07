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
  getPaymentSources,
  getExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseCategory,
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

// ============================================================================
// EXPENSE TRACKING
// ============================================================================

/**
 * Fetch all payment sources
 */
export async function fetchPaymentSources() {
  const sources = await getPaymentSources();
  return { success: true, data: sources };
}

/**
 * Fetch expenses with optional filters
 */
export async function fetchExpenses(filters?: {
  projectId?: string;
  category?: ExpenseCategory;
  startDate?: string;
  endDate?: string;
}) {
  const expenses = await getExpenses(filters);
  return { success: true, data: expenses };
}

/**
 * Fetch expense summary for dashboard
 */
export async function fetchExpenseSummary() {
  const summary = await getExpenseSummary();
  return { success: true, data: summary };
}

/**
 * Create a new expense
 */
export async function addExpense(expense: {
  date: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  project_id?: string | null;
  payment_source_id: string;
  paid_by?: string | null;
  reimbursed?: boolean;
  receipt_url?: string | null;
}) {
  const result = await createExpense(expense);

  if (result.success) {
    revalidatePath('/dashboard/admin/metrics');
  }

  return result;
}

/**
 * Update an existing expense
 */
export async function editExpense(
  id: string,
  updates: Partial<{
    date: string;
    description: string;
    amount: number;
    category: ExpenseCategory;
    project_id: string | null;
    payment_source_id: string;
    paid_by: string | null;
    reimbursed: boolean;
    receipt_url: string | null;
  }>
) {
  const result = await updateExpense(id, updates);

  if (result.success) {
    revalidatePath('/dashboard/admin/metrics');
  }

  return result;
}

/**
 * Delete an expense
 */
export async function removeExpense(id: string) {
  const result = await deleteExpense(id);

  if (result.success) {
    revalidatePath('/dashboard/admin/metrics');
  }

  return result;
}

// ============================================================================
// INVOICE MANAGEMENT
// ============================================================================

import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  sendInvoice,
  voidInvoice,
  deleteInvoice,
  getInvoiceStats,
} from '@/lib/api/invoices';
import type { CreateInvoiceInput, UpdateInvoiceInput } from '@/lib/types/invoices';

/**
 * Fetch all invoices with optional filters
 */
export async function fetchInvoices(filters?: {
  projectId?: string;
  status?: string;
  limit?: number;
}) {
  const invoices = await getInvoices(filters);
  return { success: true, data: invoices };
}

/**
 * Fetch invoice statistics
 */
export async function fetchInvoiceStats() {
  const stats = await getInvoiceStats();
  return { success: true, data: stats };
}

/**
 * Create a new invoice
 */
export async function addInvoice(input: CreateInvoiceInput) {
  const result = await createInvoice(input);

  if (result.success) {
    revalidatePath('/dashboard/admin/metrics');
  }

  return result;
}

/**
 * Update a draft invoice
 */
export async function editInvoice(id: string, input: UpdateInvoiceInput) {
  const result = await updateInvoice(id, input);

  if (result.success) {
    revalidatePath('/dashboard/admin/metrics');
  }

  return result;
}

/**
 * Send invoice to client via Stripe
 */
export async function sendInvoiceToClient(id: string) {
  const result = await sendInvoice(id);

  if (result.success) {
    revalidatePath('/dashboard/admin/metrics');
  }

  return result;
}

/**
 * Void an invoice
 */
export async function voidExistingInvoice(id: string) {
  const result = await voidInvoice(id);

  if (result.success) {
    revalidatePath('/dashboard/admin/metrics');
  }

  return result;
}

/**
 * Delete a draft invoice
 */
export async function removeInvoice(id: string) {
  const result = await deleteInvoice(id);

  if (result.success) {
    revalidatePath('/dashboard/admin/metrics');
  }

  return result;
}

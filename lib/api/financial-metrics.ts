/**
 * Financial Metrics API
 *
 * Provides functions for:
 * - Pending payments tracking
 * - Payment milestones
 * - Projected revenue calculations
 * - Sales cycle analytics
 */

import { createServerClient } from '@/lib/supabase/server';

type PaymentStructure = '100_upfront' | '50_50' | '40_30_30' | 'custom';

// ============================================================================
// TYPES
// ============================================================================

export interface FinancialHeroMetrics {
  total_revenue: number;
  revenue_this_month: number;
  pending_payments: number;
  payable_this_month: number;
  payable_next_month: number;
  projected_revenue: number;
  win_rate: number;
  avg_ticket_size: number;
  active_inquiries: number;
}

export interface PaymentTimelineItem {
  month: string;
  milestone_count: number;
  expected_revenue: number;
  projects: string[];
}

export interface RevenueTrendItem {
  month: string;
  projects_started: number;
  revenue: number;
}

export interface OverduePayment {
  milestone_id: string;
  project_name: string;
  client_name: string;
  milestone_label: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  project_status: string;
}

export interface SalesCycleStats {
  avg_sales_cycle_days: number;
  median_sales_cycle_days: number;
  min_sales_cycle_days: number;
  max_sales_cycle_days: number;
  total_closed_deals: number;
}

export interface ProjectedRevenueTimelineItem {
  month: string;
  expected_deals: number;
  projected_revenue: number;
}

export interface PendingPaymentByProject {
  id: string;
  project_name: string;
  client_name: string;
  quoted_price: number;
  payment_structure: PaymentStructure;
  status: string;
  paid_amount: number;
  pending_amount: number;
  payment_completion_pct: number;
}

// ============================================================================
// HERO METRICS
// ============================================================================

/**
 * Get financial hero metrics for admin dashboard
 * Returns: total revenue, pending payments, payables, projected revenue, etc.
 */
export async function getFinancialHeroMetrics(): Promise<FinancialHeroMetrics | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc('get_financial_hero_metrics').single();

  if (error) {
    console.error('Error fetching financial hero metrics:', error);
    return null;
  }

  return data as FinancialHeroMetrics;
}

// ============================================================================
// PAYMENT TIMELINE
// ============================================================================

/**
 * Get payment collection timeline for next N months
 * @param months - Number of months to project (default: 12)
 */
export async function getPaymentTimeline(months: number = 12): Promise<PaymentTimelineItem[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc('get_payment_timeline', { p_months: months });

  if (error) {
    console.error('Error fetching payment timeline:', error);
    return [];
  }

  return data as PaymentTimelineItem[];
}

// ============================================================================
// REVENUE TREND
// ============================================================================

/**
 * Get revenue trend for past N months
 * @param months - Number of months to look back (default: 12)
 */
export async function getRevenueTrend(months: number = 12): Promise<RevenueTrendItem[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc('get_revenue_trend', { p_months: months });

  if (error) {
    console.error('Error fetching revenue trend:', error);
    return [];
  }

  return data as RevenueTrendItem[];
}

// ============================================================================
// OVERDUE PAYMENTS
// ============================================================================

/**
 * Get all overdue payment milestones
 */
export async function getOverduePayments(): Promise<OverduePayment[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc('get_overdue_payments');

  if (error) {
    console.error('Error fetching overdue payments:', error);
    return [];
  }

  return data as OverduePayment[];
}

// ============================================================================
// SALES CYCLE STATS
// ============================================================================

/**
 * Get sales cycle statistics (avg, median, min, max days)
 */
export async function getSalesCycleStats(): Promise<SalesCycleStats | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc('get_sales_cycle_stats').single();

  if (error) {
    console.error('Error fetching sales cycle stats:', error);
    return null;
  }

  return data as SalesCycleStats;
}

// ============================================================================
// PROJECTED REVENUE
// ============================================================================

/**
 * Get projected revenue timeline for next 3 months
 * Based on active inquiries, win rate, and avg sales cycle
 */
export async function getProjectedRevenueTimeline(): Promise<ProjectedRevenueTimelineItem[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc('get_projected_revenue_timeline');

  if (error) {
    console.error('Error fetching projected revenue timeline:', error);
    return [];
  }

  return data as ProjectedRevenueTimelineItem[];
}

// ============================================================================
// PENDING PAYMENTS BY PROJECT
// ============================================================================

/**
 * Get pending payments breakdown by project
 */
export async function getPendingPaymentsByProject(): Promise<PendingPaymentByProject[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('financial_overview')
    .select('*')
    .order('pending_amount', { ascending: false });

  if (error) {
    console.error('Error fetching pending payments by project:', error);
    return [];
  }

  return data as PendingPaymentByProject[];
}

// ============================================================================
// PAYMENT MILESTONE CRUD
// ============================================================================

/**
 * Create payment milestones for a project
 */
export async function createPaymentMilestones(
  projectId: string,
  quotedPrice: number,
  paymentStructure: PaymentStructure,
  targetDeliveryDate: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase.rpc('create_payment_milestones', {
    p_project_id: projectId,
    p_quoted_price: quotedPrice,
    p_payment_structure: paymentStructure,
    p_target_delivery_date: targetDeliveryDate,
  });

  if (error) {
    console.error('Error creating payment milestones:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Mark a payment milestone as paid
 */
export async function markMilestoneAsPaid(
  milestoneId: string,
  paidAt: string = new Date().toISOString(),
  stripePaymentId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const updateData: any = { paid_at: paidAt };
  if (stripePaymentId) {
    updateData.stripe_payment_id = stripePaymentId;
  }

  const { error } = await supabase
    .from('payment_milestones')
    .update(updateData)
    .eq('id', milestoneId);

  if (error) {
    console.error('Error marking milestone as paid:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update payment milestone due date
 */
export async function updateMilestoneDueDate(
  milestoneId: string,
  dueDate: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('payment_milestones')
    .update({ due_date: dueDate })
    .eq('id', milestoneId);

  if (error) {
    console.error('Error updating milestone due date:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get payment milestones for a specific project
 */
export async function getProjectPaymentMilestones(projectId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('payment_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching project payment milestones:', error);
    return [];
  }

  return data;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate payment completion percentage for a project
 */
export function calculatePaymentCompletion(
  paidAmount: number,
  totalAmount: number
): number {
  if (totalAmount === 0) return 0;
  return Math.round((paidAmount / totalAmount) * 100);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100) / 100}%`;
}

/**
 * Get payment urgency level
 */
export function getPaymentUrgency(dueDate: string): 'overdue' | 'due_soon' | 'upcoming' {
  const due = new Date(dueDate);
  const now = new Date();
  const daysDiff = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return 'overdue';
  if (daysDiff <= 7) return 'due_soon';
  return 'upcoming';
}

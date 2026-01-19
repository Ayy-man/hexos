import { createClient } from '@/lib/supabase/admin';
import { createNotification } from './notifications';
import { activityLogger } from '@/lib/logging/activity-logger';

// Re-export types and helpers from shared (client-safe) module
export type {
  PayoutStatus,
  PayoutType,
  PaymentMethod,
  PaymentPreference,
  WireTransferDetails,
  Payout,
  PayoutWithDetails,
  PayoutFilters,
  SubmitPayoutInput,
  PaymentDetails,
  PayoutMetrics,
} from './payouts.shared';

export { formatPayoutStatus, getPayoutStatusColor } from './payouts.shared';

import type {
  Payout,
  PayoutStatus,
  PayoutFilters,
  SubmitPayoutInput,
  PaymentDetails,
  PayoutMetrics,
  PayoutWithDetails,
} from './payouts.shared';

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

export async function getPayouts(filters?: PayoutFilters): Promise<PayoutWithDetails[]> {
  const supabase = createClient();

  // First try simple query without joins to debug
  let query = supabase
    .from('payouts')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }

  if (filters?.submitted_by) {
    query = query.eq('submitted_by', filters.submitted_by);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching payouts:', error);
    return [];
  }

  return (data || []).map(normalizePayoutRelations);
}

export async function getPayout(id: string): Promise<PayoutWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching payout:', error);
    return null;
  }

  return normalizePayoutRelations(data);
}

export async function approvePayout(
  id: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const payout = await getPayout(id);
  if (!payout) {
    return { success: false, error: 'Payout not found' };
  }

  if (payout.status !== 'pending') {
    return { success: false, error: 'Can only approve pending payouts' };
  }

  const { error } = await supabase
    .from('payouts')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error approving payout:', error);
    return { success: false, error: error.message };
  }

  // Log payout approval
  activityLogger.payment.payoutApproved(
    approvedBy,
    '', // Email not available here
    id,
    payout.amount,
    payout.submitter?.email || ''
  );

  // Notify the dev
  if (payout.submitted_by) {
    await createNotification({
      userId: payout.submitted_by,
      type: 'payout_approved',
      title: 'Payout Approved',
      message: `Your payout request for $${(payout.amount / 100).toFixed(2)} has been approved`,
      projectId: payout.project_id || undefined,
    });
  }

  return { success: true };
}

export async function rejectPayout(
  id: string,
  reason: string,
  rejectedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const payout = await getPayout(id);
  if (!payout) {
    return { success: false, error: 'Payout not found' };
  }

  if (!['pending', 'approved'].includes(payout.status)) {
    return { success: false, error: 'Cannot reject this payout' };
  }

  const { error } = await supabase
    .from('payouts')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
      rejected_by: rejectedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error rejecting payout:', error);
    return { success: false, error: error.message };
  }

  // Notify the dev
  if (payout.submitted_by) {
    await createNotification({
      userId: payout.submitted_by,
      type: 'payout_rejected',
      title: 'Payout Rejected',
      message: `Your payout request was rejected: ${reason}`,
      projectId: payout.project_id || undefined,
    });
  }

  return { success: true };
}

export async function markPayoutPaid(
  id: string,
  payment: PaymentDetails,
  paidBy: string
): Promise<{ success: boolean; error?: string; expense_id?: string }> {
  const supabase = createClient();

  const payout = await getPayout(id);
  if (!payout) {
    return { success: false, error: 'Payout not found' };
  }

  if (!['pending', 'approved'].includes(payout.status)) {
    return { success: false, error: 'Can only mark pending or approved payouts as paid' };
  }

  // 1. Create expense record
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      date: new Date().toISOString().split('T')[0],
      description: `Payout: ${payout.description || 'Developer payment'}`,
      amount: payout.amount / 100, // Convert cents to dollars
      category: 'contractor',
      project_id: payout.project_id,
      receipt_url: payout.contractor_invoice_url,
      created_by: paidBy,
    })
    .select()
    .single();

  if (expenseError) {
    console.error('Error creating expense for payout:', expenseError);
    // Continue anyway - expense creation is secondary
  }

  // 2. Update payout
  const { error } = await supabase
    .from('payouts')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by: paidBy,
      payment_method: payment.method,
      payment_reference: payment.reference,
      expense_id: expense?.id || null,
      notes: payment.notes || payout.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error marking payout as paid:', error);
    return { success: false, error: error.message };
  }

  // Log payout sent
  activityLogger.payment.payoutSent(
    id,
    payout.amount,
    payout.submitter?.email || ''
  );

  // 3. Notify the dev
  if (payout.submitted_by) {
    await createNotification({
      userId: payout.submitted_by,
      type: 'payout_paid',
      title: 'Payment Sent',
      message: `Your payout of $${(payout.amount / 100).toFixed(2)} has been sent via ${payment.method.replace('_', ' ')}`,
      projectId: payout.project_id || undefined,
    });
  }

  return { success: true, expense_id: expense?.id };
}

// ============================================================================
// DEV FUNCTIONS
// ============================================================================

export async function getMyPayouts(userId: string): Promise<PayoutWithDetails[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('payouts')
    .select(`
      *,
      project:projects!project_id(id, project_name, client_name)
    `)
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user payouts:', error);
    return [];
  }

  return (data || []).map(normalizePayoutRelations);
}

export async function submitPayout(
  input: SubmitPayoutInput
): Promise<{ success: boolean; data?: Payout; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('payouts')
    .insert({
      project_id: input.project_id,
      description: input.description,
      amount: input.amount,
      type: 'dev_payment',
      status: 'pending',
      contractor_invoice_url: input.invoice_file_url,
      invoice_number: input.invoice_number,
      invoice_date: input.invoice_date,
      submitted_by: input.submitted_by,
      submitted_at: new Date().toISOString(),
      // Payment preference
      payment_preference: input.payment_preference,
      // Wire transfer details
      wire_recipient_name: input.wire_details?.recipient_name || null,
      wire_swift_code: input.wire_details?.swift_code || null,
      wire_account_number: input.wire_details?.account_number || null,
      wire_bank_name: input.wire_details?.bank_name || null,
      wire_bank_address: input.wire_details?.bank_address || null,
      wire_recipient_address: input.wire_details?.recipient_address || null,
      wire_recipient_country: input.wire_details?.recipient_country || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting payout:', error);
    return { success: false, error: error.message };
  }

  // Notify admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'internal']);

  const { data: submitter } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', input.submitted_by)
    .single();

  for (const admin of admins || []) {
    await createNotification({
      userId: admin.id,
      type: 'payout_submitted',
      title: 'New Payout Request',
      message: `${submitter?.name || 'A developer'} submitted a payout request for $${(input.amount / 100).toFixed(2)}`,
      projectId: input.project_id || undefined,
    });
  }

  return { success: true, data };
}

// ============================================================================
// METRICS
// ============================================================================

export async function getPayoutMetrics(): Promise<PayoutMetrics> {
  const supabase = createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: payouts } = await supabase.from('payouts').select('status, amount, paid_at');

  const metrics: PayoutMetrics = {
    pending_count: 0,
    pending_amount: 0,
    approved_count: 0,
    approved_amount: 0,
    paid_this_month: 0,
    paid_this_month_amount: 0,
    total_paid: 0,
    total_paid_amount: 0,
  };

  for (const payout of payouts || []) {
    if (payout.status === 'pending') {
      metrics.pending_count++;
      metrics.pending_amount += payout.amount;
    } else if (payout.status === 'approved') {
      metrics.approved_count++;
      metrics.approved_amount += payout.amount;
    } else if (payout.status === 'paid' || payout.status === 'completed') {
      metrics.total_paid++;
      metrics.total_paid_amount += payout.amount;

      if (payout.paid_at && payout.paid_at >= startOfMonth) {
        metrics.paid_this_month++;
        metrics.paid_this_month_amount += payout.amount;
      }
    }
  }

  return metrics;
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizePayoutRelations(payout: any): PayoutWithDetails {
  return {
    ...payout,
    submitter: Array.isArray(payout.submitter) ? payout.submitter[0] : payout.submitter,
    project: Array.isArray(payout.project) ? payout.project[0] : payout.project,
    recipient: Array.isArray(payout.recipient) ? payout.recipient[0] : payout.recipient,
  };
}

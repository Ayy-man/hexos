import { createClient } from '@/lib/supabase/admin';
import { createNotification } from './notifications';

// ============================================================================
// TYPES
// ============================================================================

export type PayoutStatus =
  | 'pending'
  | 'approved'
  | 'paid'
  | 'rejected'
  | 'invoice_required'
  | 'invoice_uploaded'
  | 'revision_needed'
  | 'verified'
  | 'processing'
  | 'completed'
  | 'failed';

export type PayoutType = 'commission' | 'dev_payment' | 'contractor' | 'reimbursement';

export type PaymentMethod = 'bank_transfer' | 'paypal' | 'wise' | 'crypto' | 'other';

export interface Payout {
  id: string;
  created_at: string;
  updated_at: string;
  recipient_id: string | null;
  project_id: string | null;
  type: PayoutType;
  amount: number;
  description: string | null;
  status: PayoutStatus;
  approved_at: string | null;
  approved_by: string | null;
  contractor_invoice_url: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  expense_id: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  paid_by: string | null;
  notes: string | null;
}

export interface PayoutWithDetails extends Payout {
  submitter?: {
    id: string;
    name: string;
    email: string;
  } | null;
  project?: {
    id: string;
    project_name: string;
    client_name: string;
  } | null;
  recipient?: {
    id: string;
    name: string;
    email: string;
    type: string;
  } | null;
}

export interface PayoutFilters {
  status?: PayoutStatus | 'all';
  type?: PayoutType | 'all';
  submitted_by?: string;
}

export interface SubmitPayoutInput {
  project_id: string | null;
  description: string;
  amount: number; // in cents
  invoice_file_url: string;
  invoice_number: string;
  invoice_date: string;
  submitted_by: string;
}

export interface PaymentDetails {
  method: PaymentMethod;
  reference: string;
  notes?: string;
}

export interface PayoutMetrics {
  pending_count: number;
  pending_amount: number;
  approved_count: number;
  approved_amount: number;
  paid_this_month: number;
  paid_this_month_amount: number;
  total_paid: number;
  total_paid_amount: number;
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

export async function getPayouts(filters?: PayoutFilters): Promise<PayoutWithDetails[]> {
  const supabase = createClient();

  let query = supabase
    .from('payouts')
    .select(`
      *,
      submitter:submitted_by(id, name, email),
      project:project_id(id, project_name, client_name),
      recipient:recipient_id(id, name, email, type)
    `)
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
    .select(`
      *,
      submitter:submitted_by(id, name, email),
      project:project_id(id, project_name, client_name),
      recipient:recipient_id(id, name, email, type)
    `)
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

  if (payout.status !== 'approved') {
    return { success: false, error: 'Can only mark approved payouts as paid' };
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
      project:project_id(id, project_name, client_name)
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

export function formatPayoutStatus(status: PayoutStatus): string {
  const labels: Record<PayoutStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    paid: 'Paid',
    rejected: 'Rejected',
    invoice_required: 'Invoice Required',
    invoice_uploaded: 'Invoice Uploaded',
    revision_needed: 'Revision Needed',
    verified: 'Verified',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
  };
  return labels[status] || status;
}

export function getPayoutStatusColor(status: PayoutStatus): string {
  const colors: Record<PayoutStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-blue-500/20 text-blue-400',
    paid: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    invoice_required: 'bg-orange-500/20 text-orange-400',
    invoice_uploaded: 'bg-purple-500/20 text-purple-400',
    revision_needed: 'bg-orange-500/20 text-orange-400',
    verified: 'bg-blue-500/20 text-blue-400',
    processing: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
}

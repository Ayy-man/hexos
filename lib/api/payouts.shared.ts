// Shared types and helpers for payouts - safe for client components
// Server-only functions are in payouts.ts

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

export type PaymentPreference = 'wire_transfer' | 'emailed_invoice';

export interface WireTransferDetails {
  recipient_name: string;
  swift_code: string;
  account_number: string; // IBAN or account number
  bank_name: string;
  bank_address?: string;
  recipient_address?: string;
  recipient_country: string;
}

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
  // Payment preference
  payment_preference: PaymentPreference | null;
  // Wire transfer details
  wire_recipient_name: string | null;
  wire_swift_code: string | null;
  wire_account_number: string | null;
  wire_bank_name: string | null;
  wire_bank_address: string | null;
  wire_recipient_address: string | null;
  wire_recipient_country: string | null;
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
  invoice_file_url: string | null;
  invoice_number: string;
  invoice_date: string;
  submitted_by: string;
  // Payment preference
  payment_preference: PaymentPreference;
  // Wire transfer details (required if payment_preference = 'wire_transfer')
  wire_details?: WireTransferDetails;
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

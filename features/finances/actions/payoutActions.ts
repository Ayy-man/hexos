'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  approvePayout,
  rejectPayout,
  markPayoutPaid,
  submitPayout,
  type PaymentMethod,
} from '@/lib/api/payouts';
import {
  uploadPayoutInvoice,
  isValidInvoiceType,
  isValidInvoiceSize,
  MAX_INVOICE_SIZE,
} from '@/lib/api/payout-attachments';

// ============================================================================
// ADMIN ACTIONS
// ============================================================================

export async function approvePayoutAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const result = await approvePayout(id, user.id);

  if (result.success) {
    revalidatePath('/finances/payouts');
    revalidatePath('/finances');
  }

  return result;
}

export async function rejectPayoutAction(id: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!reason.trim()) {
    return { success: false, error: 'Rejection reason is required' };
  }

  const result = await rejectPayout(id, reason, user.id);

  if (result.success) {
    revalidatePath('/finances/payouts');
    revalidatePath('/finances');
  }

  return result;
}

export async function markPayoutPaidAction(
  id: string,
  method: PaymentMethod,
  reference: string,
  notes?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!reference.trim()) {
    return { success: false, error: 'Payment reference is required' };
  }

  const result = await markPayoutPaid(id, { method, reference, notes }, user.id);

  if (result.success) {
    revalidatePath('/finances/payouts');
    revalidatePath('/finances/expenses');
    revalidatePath('/finances');
  }

  return result;
}

// ============================================================================
// DEV ACTIONS
// ============================================================================

export async function submitPayoutAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Extract form data
  const projectId = formData.get('project_id') as string | null;
  const description = formData.get('description') as string;
  const amount = formData.get('amount') as string;
  const invoiceNumber = formData.get('invoice_number') as string;
  const invoiceDate = formData.get('invoice_date') as string;
  const invoiceFile = formData.get('invoice_file') as File | null;

  // Validate
  if (!description?.trim()) {
    return { success: false, error: 'Description is required' };
  }

  const amountCents = Math.round(parseFloat(amount) * 100);
  if (isNaN(amountCents) || amountCents <= 0) {
    return { success: false, error: 'Valid amount is required' };
  }

  if (!invoiceFile) {
    return { success: false, error: 'Invoice file is required' };
  }

  if (!isValidInvoiceType(invoiceFile.type)) {
    return { success: false, error: 'Invoice must be PDF, JPG, PNG, or WebP' };
  }

  if (!isValidInvoiceSize(invoiceFile.size)) {
    return {
      success: false,
      error: `Invoice file must be less than ${MAX_INVOICE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Upload invoice file
  const uploadResult = await uploadPayoutInvoice({
    userId: user.id,
    file: invoiceFile,
  });

  if (!uploadResult.success || !uploadResult.url) {
    return { success: false, error: uploadResult.error || 'Failed to upload invoice' };
  }

  // Submit payout
  const result = await submitPayout({
    project_id: projectId || null,
    description,
    amount: amountCents,
    invoice_file_url: uploadResult.url,
    invoice_number: invoiceNumber || '',
    invoice_date: invoiceDate || new Date().toISOString().split('T')[0],
    submitted_by: user.id,
  });

  if (result.success) {
    revalidatePath('/dashboard/dev/payouts');
  }

  return result;
}

// ============================================================================
// SHARED ACTIONS
// ============================================================================

export async function getAssignedProjectsAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { projects: [] };
  }

  // Get projects where user is assigned as dev
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_name, client_name')
    .eq('assigned_dev_id', user.id)
    .order('project_name');

  return { projects: projects || [] };
}

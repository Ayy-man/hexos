'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/admin';

export interface RetainerFormData {
  client_name: string;
  client_email: string;
  project_id?: string | null;
  amount: number;
  currency?: string;
  billing_day: number;
  billing_frequency: 'monthly' | 'quarterly' | 'yearly';
  description: string;
  start_date: string;
  end_date?: string | null;
}

export async function createRetainer(data: RetainerFormData) {
  const supabase = createClient();

  // Calculate next invoice date based on billing day and start date
  const startDate = new Date(data.start_date);
  let nextInvoiceDate = new Date(startDate);
  nextInvoiceDate.setDate(data.billing_day);

  // If the billing day has already passed this month, move to next period
  if (nextInvoiceDate <= startDate) {
    if (data.billing_frequency === 'monthly') {
      nextInvoiceDate.setMonth(nextInvoiceDate.getMonth() + 1);
    } else if (data.billing_frequency === 'quarterly') {
      nextInvoiceDate.setMonth(nextInvoiceDate.getMonth() + 3);
    } else {
      nextInvoiceDate.setFullYear(nextInvoiceDate.getFullYear() + 1);
    }
  }

  const { data: retainer, error } = await supabase
    .from('retainers')
    .insert({
      client_name: data.client_name,
      client_email: data.client_email,
      project_id: data.project_id || null,
      amount: data.amount,
      currency: data.currency || 'usd',
      billing_day: data.billing_day,
      billing_frequency: data.billing_frequency,
      description: data.description,
      start_date: data.start_date,
      end_date: data.end_date || null,
      next_invoice_date: nextInvoiceDate.toISOString().split('T')[0],
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/finances/retainers');
  return { retainer };
}

export async function updateRetainer(id: string, data: Partial<RetainerFormData>) {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {};

  if (data.client_name !== undefined) updateData.client_name = data.client_name;
  if (data.client_email !== undefined) updateData.client_email = data.client_email;
  if (data.project_id !== undefined) updateData.project_id = data.project_id || null;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.billing_day !== undefined) updateData.billing_day = data.billing_day;
  if (data.billing_frequency !== undefined) updateData.billing_frequency = data.billing_frequency;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.end_date !== undefined) updateData.end_date = data.end_date || null;

  const { data: retainer, error } = await supabase
    .from('retainers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/finances/retainers');
  return { retainer };
}

export async function pauseRetainer(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('retainers')
    .update({ status: 'paused' })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/finances/retainers');
  return { success: true };
}

export async function resumeRetainer(id: string) {
  const supabase = createClient();

  // Get the retainer to recalculate next invoice date
  const { data: retainer } = await supabase
    .from('retainers')
    .select('billing_day, billing_frequency')
    .eq('id', id)
    .single();

  if (!retainer) {
    return { error: 'Retainer not found' };
  }

  // Calculate next invoice date from today
  const today = new Date();
  let nextInvoiceDate = new Date(today);
  nextInvoiceDate.setDate(retainer.billing_day);

  if (nextInvoiceDate <= today) {
    if (retainer.billing_frequency === 'monthly') {
      nextInvoiceDate.setMonth(nextInvoiceDate.getMonth() + 1);
    } else if (retainer.billing_frequency === 'quarterly') {
      nextInvoiceDate.setMonth(nextInvoiceDate.getMonth() + 3);
    } else {
      nextInvoiceDate.setFullYear(nextInvoiceDate.getFullYear() + 1);
    }
  }

  const { error } = await supabase
    .from('retainers')
    .update({
      status: 'active',
      next_invoice_date: nextInvoiceDate.toISOString().split('T')[0],
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/finances/retainers');
  return { success: true };
}

export async function cancelRetainer(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('retainers')
    .update({
      status: 'cancelled',
      end_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/finances/retainers');
  return { success: true };
}

export async function deleteRetainer(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('retainers')
    .delete()
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/finances/retainers');
  return { success: true };
}

export async function generateRetainerInvoice(retainerId: string) {
  const supabase = createClient();

  // Get retainer details
  const { data: retainer, error: retainerError } = await supabase
    .from('retainers')
    .select('*')
    .eq('id', retainerId)
    .single();

  if (retainerError || !retainer) {
    return { error: retainerError?.message || 'Retainer not found' };
  }

  // Generate invoice number
  const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');

  // Create invoice
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14); // Net 14

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      project_id: retainer.project_id,
      client_name: retainer.client_name,
      client_email: retainer.client_email,
      status: 'draft',
      subtotal: retainer.amount,
      tax_rate: 0,
      tax_amount: 0,
      total: retainer.amount,
      currency: retainer.currency,
      due_date: dueDate.toISOString().split('T')[0],
      notes: `Retainer invoice - ${retainer.description}`,
    })
    .select()
    .single();

  if (invoiceError) {
    return { error: invoiceError.message };
  }

  // Add line item
  await supabase.from('invoice_line_items').insert({
    invoice_id: invoice.id,
    description: retainer.description,
    quantity: 1,
    unit_price: retainer.amount,
    amount: retainer.amount,
  });

  // Calculate next invoice date
  const today = new Date();
  let nextDate = new Date(today);
  nextDate.setDate(retainer.billing_day);

  if (nextDate <= today) {
    if (retainer.billing_frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (retainer.billing_frequency === 'quarterly') {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
  }

  // Update retainer with last invoice info
  await supabase
    .from('retainers')
    .update({
      last_invoice_id: invoice.id,
      last_invoice_date: today.toISOString().split('T')[0],
      next_invoice_date: nextDate.toISOString().split('T')[0],
    })
    .eq('id', retainerId);

  revalidatePath('/finances/retainers');
  revalidatePath('/finances/invoices');

  return { invoice };
}

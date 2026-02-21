/**
 * Invoice API
 * CRUD operations for invoices with Stripe integration
 */

import { createClient } from '@/lib/supabase/admin'
import {
  createStripeInvoice,
  finalizeAndSendInvoice,
  voidStripeInvoice,
  createCheckoutSession,
} from '@/lib/stripe/server'
import { createNotification } from '@/lib/api/notifications'
import { notifyAdmins } from '@/lib/api/notification-helpers'
import { activityLogger } from '@/lib/logging/activity-logger'
import type {
  Invoice,
  InvoiceWithProject,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceLineItem,
} from '@/lib/types/invoices'

// ============================================================================
// INVOICE CRUD
// ============================================================================

/**
 * Get all invoices with optional filters
 */
export async function getInvoices(filters?: {
  projectId?: string
  status?: string
  limit?: number
}): Promise<InvoiceWithProject[]> {
  const supabase = createClient()

  let query = supabase
    .from('invoices')
    .select(
      `
      *,
      projects!project_id(name),
      milestones!milestone_id(label)
    `
    )
    .order('created_at', { ascending: false })

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching invoices:', error)
    return []
  }

  return (data || []).map((invoice: any) => ({
    ...invoice,
    project_name: invoice.projects?.name || null,
    milestone_label: invoice.milestones?.label || null,
    projects: undefined,
    milestones: undefined,
  }))
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(id: string): Promise<InvoiceWithProject | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(
      `
      *,
      projects!project_id(name, dfy_partner_id, client_id),
      milestones!milestone_id(label)
    `
    )
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching invoice:', error)
    return null
  }

  return {
    ...data,
    project_name: (data as any).projects?.name || null,
    dfy_partner_id: (data as any).projects?.dfy_partner_id || null,
    client_id: (data as any).projects?.client_id || null,
    milestone_label: (data as any).milestones?.label || null,
    projects: undefined,
    milestones: undefined,
  } as InvoiceWithProject
}

/**
 * Get invoice by invoice number
 */
export async function getInvoiceByNumber(
  invoiceNumber: string
): Promise<InvoiceWithProject | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(
      `
      *,
      projects!project_id(name),
      milestones!milestone_id(label)
    `
    )
    .eq('invoice_number', invoiceNumber)
    .single()

  if (error) {
    console.error('Error fetching invoice by number:', error)
    return null
  }

  return {
    ...data,
    project_name: (data as any).projects?.name || null,
    milestone_label: (data as any).milestones?.label || null,
    projects: undefined,
    milestones: undefined,
  } as InvoiceWithProject
}

/**
 * Create a new invoice (draft status)
 */
export async function createInvoice(
  input: CreateInvoiceInput
): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  const supabase = createClient()

  // Generate invoice number using DB function
  const { data: invoiceNumber, error: numError } = await supabase.rpc(
    'generate_invoice_number'
  )

  if (numError) {
    console.error('Error generating invoice number:', numError)
    return { success: false, error: 'Failed to generate invoice number' }
  }

  // Calculate line items with amounts
  const lineItems: InvoiceLineItem[] = input.line_items.map((item) => ({
    ...item,
    amount: item.quantity * item.unit_price,
  }))

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const taxRate = input.tax_rate || 0
  const taxAmount = Math.round(subtotal * taxRate)
  const total = subtotal + taxAmount

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      project_id: input.project_id || null,
      milestone_id: input.milestone_id || null,
      client_name: input.client_name,
      client_email: input.client_email,
      client_company: input.client_company || null,
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      due_date: input.due_date,
      notes: input.notes || null,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating invoice:', error)
    return { success: false, error: error.message }
  }

  // Log invoice creation
  activityLogger.payment.invoiceCreated(
    '', // No user context in this function
    '',
    data.id,
    data.invoice_number,
    total,
    input.client_name
  )

  return { success: true, data: data as Invoice }
}

/**
 * Update a draft invoice
 */
export async function updateInvoice(
  id: string,
  input: UpdateInvoiceInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Verify invoice is still draft
  const { data: existing, error: fetchError } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: 'Invoice not found' }
  }

  if (existing.status !== 'draft') {
    return { success: false, error: 'Can only edit draft invoices' }
  }

  // Build update object
  const updates: any = {}

  if (input.client_name) updates.client_name = input.client_name
  if (input.client_email) updates.client_email = input.client_email
  if (input.client_company !== undefined)
    updates.client_company = input.client_company
  if (input.due_date) updates.due_date = input.due_date
  if (input.notes !== undefined) updates.notes = input.notes

  // Recalculate if line items changed
  if (input.line_items) {
    const lineItems: InvoiceLineItem[] = input.line_items.map((item) => ({
      ...item,
      amount: item.quantity * item.unit_price,
    }))

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
    const taxRate = input.tax_rate ?? 0
    const taxAmount = Math.round(subtotal * taxRate)
    const total = subtotal + taxAmount

    updates.line_items = lineItems
    updates.subtotal = subtotal
    updates.tax_rate = taxRate
    updates.tax_amount = taxAmount
    updates.total = total
  }

  const { error } = await supabase.from('invoices').update(updates).eq('id', id)

  if (error) {
    console.error('Error updating invoice:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Send invoice to client via Stripe
 */
export async function sendInvoice(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Get full invoice
  const invoice = await getInvoice(id)
  if (!invoice) {
    return { success: false, error: 'Invoice not found' }
  }

  if (invoice.status !== 'draft') {
    return { success: false, error: 'Can only send draft invoices' }
  }

  try {
    // Create Stripe invoice
    const stripeInvoice = await createStripeInvoice({
      customerEmail: invoice.client_email,
      customerName: invoice.client_name,
      lineItems: invoice.line_items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmount: item.unit_price,
      })),
      dueDate: new Date(invoice.due_date),
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        project_id: invoice.project_id || '',
      },
    })

    // Finalize and send
    const sentInvoice = await finalizeAndSendInvoice(stripeInvoice.id)

    // Update our invoice with Stripe IDs
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        stripe_invoice_id: sentInvoice.id,
        stripe_hosted_url: sentInvoice.hosted_invoice_url,
        stripe_pdf_url: sentInvoice.invoice_pdf,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating invoice with Stripe IDs:', updateError)
      return { success: false, error: 'Invoice sent but failed to update record' }
    }

    // Log invoice sent
    activityLogger.payment.invoiceSent(
      '', // No user context
      '',
      invoice.id,
      invoice.invoice_number,
      invoice.total,
      invoice.client_email
    )

    // Notify DFY Partner if present
    if (invoice.dfy_partner_id) {
      try {
        await createNotification({
          userId: invoice.dfy_partner_id,
          type: 'invoice_sent',
          title: 'Invoice Sent',
          message: `An invoice for ${invoice.total / 100} USD has been sent to ${invoice.client_name} for project ${invoice.project_name || 'N/A'}.`,
          projectId: invoice.project_id || undefined,
        })
      } catch (notifyErr) {
        console.error('Error notifying DFY partner:', notifyErr)
        // Don't fail the whole operation if notification fails
      }
    }

    // Notify client and admins of invoice sent
    try {
      if (invoice.client_id) {
        await createNotification({
          userId: invoice.client_id,
          type: 'invoice_sent',
          title: 'New Invoice',
          message: `Invoice #${invoice.invoice_number} for $${invoice.total / 100} has been sent`,
          projectId: invoice.project_id || undefined,
        })
      }
      await notifyAdmins({
        type: 'invoice_sent',
        title: 'Invoice Sent',
        message: `Invoice #${invoice.invoice_number} for $${invoice.total / 100} sent to ${invoice.client_name}`,
        projectId: invoice.project_id || undefined,
      })
    } catch (e) {
      console.error('[sendInvoice] Notification failed:', e)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Error sending invoice via Stripe:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Create a Stripe Checkout session for an invoice
 * Use this for direct payment without Stripe hosted invoice
 */
export async function createInvoiceCheckoutSession(
  invoiceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ success: boolean; sessionId?: string; url?: string; error?: string }> {
  const invoice = await getInvoice(invoiceId)
  if (!invoice) {
    return { success: false, error: 'Invoice not found' }
  }

  if (invoice.status === 'paid') {
    return { success: false, error: 'Invoice already paid' }
  }

  if (invoice.status === 'void') {
    return { success: false, error: 'Invoice has been voided' }
  }

  try {
    const session = await createCheckoutSession({
      invoiceId: invoice.id,
      successUrl,
      cancelUrl,
      lineItems: invoice.line_items.map((item) => ({
        name: item.description,
        amount: item.unit_price,
        quantity: item.quantity,
      })),
      customerEmail: invoice.client_email,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        project_id: invoice.project_id || '',
        milestone_id: invoice.milestone_id || '',
      },
    })

    return {
      success: true,
      sessionId: session.id,
      url: session.url || undefined,
    }
  } catch (err: any) {
    console.error('Error creating checkout session:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Void an invoice
 */
export async function voidInvoice(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const invoice = await getInvoice(id)
  if (!invoice) {
    return { success: false, error: 'Invoice not found' }
  }

  if (invoice.status === 'paid') {
    return { success: false, error: 'Cannot void a paid invoice' }
  }

  if (invoice.status === 'void') {
    return { success: false, error: 'Invoice already voided' }
  }

  try {
    // Void in Stripe if it exists
    if (invoice.stripe_invoice_id) {
      await voidStripeInvoice(invoice.stripe_invoice_id)
    }

    // Update our record
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'void' })
      .eq('id', id)

    if (error) {
      console.error('Error voiding invoice:', error)
      return { success: false, error: error.message }
    }

    // Notify DFY partner and client of invoice voided
    try {
      if (invoice.dfy_partner_id) {
        await createNotification({
          userId: invoice.dfy_partner_id,
          type: 'status_change',
          title: 'Invoice Voided',
          message: `Invoice #${invoice.invoice_number} has been voided`,
          projectId: invoice.project_id || undefined,
        })
      }
      if (invoice.client_id) {
        await createNotification({
          userId: invoice.client_id,
          type: 'status_change',
          title: 'Invoice Voided',
          message: `Invoice #${invoice.invoice_number} has been voided`,
          projectId: invoice.project_id || undefined,
        })
      }
    } catch (e) {
      console.error('[voidInvoice] Notification failed:', e)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Error voiding invoice in Stripe:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Mark invoice as paid (usually called from webhook)
 */
export async function markInvoicePaid(
  id: string,
  stripePaymentIntentId?: string
): Promise<{ success: boolean; error?: string }> {
  // Use existing static import from top of file
  const supabase = createClient()

  const updates: any = {
    status: 'paid',
    paid_at: new Date().toISOString(),
  }

  if (stripePaymentIntentId) {
    updates.stripe_payment_intent_id = stripePaymentIntentId
  }

  const { error } = await supabase.from('invoices').update(updates).eq('id', id)

  if (error) {
    console.error('Error marking invoice as paid:', error)
    return { success: false, error: error.message }
  }

  // Fetch full invoice with project details
  const invoice = await getInvoice(id)

  // Also mark associated milestone as paid if linked
  if (invoice?.milestone_id) {
    await supabase
      .from('payment_milestones')
      .update({
        paid_at: new Date().toISOString(),
        stripe_payment_id: stripePaymentIntentId,
      })
      .eq('id', invoice.milestone_id)
  }

  // Log invoice paid
  if (invoice) {
    activityLogger.payment.invoicePaid(
      invoice.id,
      invoice.invoice_number,
      invoice.total,
      invoice.client_email
    )
  }

  // Notify DFY Partner if present
  if (invoice?.dfy_partner_id) {
    try {
      await createNotification({
        userId: invoice.dfy_partner_id,
        type: 'invoice_paid',
        title: 'Invoice Paid!',
        message: `Great news! The invoice for ${invoice.total / 100} USD for project ${invoice.project_name || 'N/A'} has been paid in full.`,
        projectId: invoice.project_id || undefined,
      })
    } catch (notifyErr) {
      console.error('Error notifying DFY partner of payment:', notifyErr)
    }
  }

  // Notify client and admins of payment received
  if (invoice) {
    try {
      if (invoice.client_id) {
        await createNotification({
          userId: invoice.client_id,
          type: 'invoice_paid',
          title: 'Payment Received',
          message: `Payment for invoice #${invoice.invoice_number} ($${invoice.total / 100}) has been received`,
          projectId: invoice.project_id || undefined,
        })
      }
      await notifyAdmins({
        type: 'invoice_paid',
        title: 'Payment Received',
        message: `Invoice #${invoice.invoice_number} ($${invoice.total / 100}) has been paid`,
        projectId: invoice.project_id || undefined,
      })
    } catch (e) {
      console.error('[markInvoicePaid] Notification failed:', e)
    }
  }

  return { success: true }
}

/**
 * Delete a draft invoice
 */
export async function deleteInvoice(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Verify invoice is draft
  const { data: existing, error: fetchError } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: 'Invoice not found' }
  }

  if (existing.status !== 'draft') {
    return { success: false, error: 'Can only delete draft invoices' }
  }

  const { error } = await supabase.from('invoices').delete().eq('id', id)

  if (error) {
    console.error('Error deleting invoice:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================================================
// INVOICE STATS
// ============================================================================

/**
 * Get invoice statistics
 */
export async function getInvoiceStats(): Promise<{
  total_invoices: number
  draft_count: number
  sent_count: number
  paid_count: number
  overdue_count: number
  total_outstanding: number
  total_collected: number
} | null> {
  const supabase = createClient()

  const { data, error } = await supabase.from('invoices').select('status, total')

  if (error) {
    console.error('Error fetching invoice stats:', error)
    return null
  }

  const stats = {
    total_invoices: data.length,
    draft_count: 0,
    sent_count: 0,
    paid_count: 0,
    overdue_count: 0,
    total_outstanding: 0,
    total_collected: 0,
  }

  for (const invoice of data) {
    switch (invoice.status) {
      case 'draft':
        stats.draft_count++
        break
      case 'sent':
        stats.sent_count++
        stats.total_outstanding += invoice.total
        break
      case 'paid':
        stats.paid_count++
        stats.total_collected += invoice.total
        break
      case 'overdue':
        stats.overdue_count++
        stats.total_outstanding += invoice.total
        break
    }
  }

  return stats
}

/**
 * Get invoice by public token (for client view)
 */
export async function getInvoiceByPublicToken(token: string): Promise<InvoiceWithProject | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      projects!project_id(name)
    `)
    .eq('public_token', token)
    .single()

  if (error) {
    console.error('Error fetching invoice by token:', error)
    return null
  }

  return {
    ...data,
    project_name: (data as any).projects?.name || null,
    projects: undefined,
  } as InvoiceWithProject
}

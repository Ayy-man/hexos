/**
 * Invoice Types
 * Stripe integration for inbound client payments
 */

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void' | 'overdue'

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_price: number // in cents
  amount: number // in cents (quantity * unit_price)
}

export interface Invoice {
  id: string
  created_at: string
  updated_at: string

  // Links
  project_id: string | null
  milestone_id: string | null

  // Invoice details
  invoice_number: string
  status: InvoiceStatus

  // Amounts (in cents)
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number

  // Dates
  issue_date: string
  due_date: string
  paid_at: string | null

  // Stripe
  stripe_invoice_id: string | null
  stripe_payment_intent_id: string | null
  stripe_hosted_url: string | null
  stripe_pdf_url: string | null

  // Recipient
  client_name: string
  client_email: string
  client_company: string | null

  // Line items
  line_items: InvoiceLineItem[]

  notes: string | null
}

// Invoice with joined data
export interface InvoiceWithProject extends Invoice {
  project_name?: string
  milestone_label?: string
}

// Create invoice input
export interface CreateInvoiceInput {
  project_id?: string | null
  milestone_id?: string | null
  client_name: string
  client_email: string
  client_company?: string | null
  line_items: Omit<InvoiceLineItem, 'amount'>[]
  tax_rate?: number
  due_date: string
  notes?: string | null
}

// Update invoice input (draft only)
export interface UpdateInvoiceInput {
  client_name?: string
  client_email?: string
  client_company?: string | null
  line_items?: Omit<InvoiceLineItem, 'amount'>[]
  tax_rate?: number
  due_date?: string
  notes?: string | null
}

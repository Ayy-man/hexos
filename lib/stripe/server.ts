import Stripe from 'stripe'

let stripeClient: Stripe | null = null

function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    })
  }
  return stripeClient
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripeClient()[prop as keyof Stripe]
  },
})

// Invoice-related helpers
export async function createStripeInvoice(params: {
  customerEmail: string
  customerName: string
  lineItems: Array<{
    description: string
    quantity: number
    unitAmount: number // in cents
  }>
  dueDate: Date
  metadata?: Record<string, string>
}) {
  // Create or get customer
  const customers = await stripe.customers.list({
    email: params.customerEmail,
    limit: 1,
  })

  let customer: Stripe.Customer
  if (customers.data.length > 0) {
    customer = customers.data[0]
  } else {
    customer = await stripe.customers.create({
      email: params.customerEmail,
      name: params.customerName,
    })
  }

  // Create invoice
  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: 'send_invoice',
    days_until_due: Math.ceil(
      (params.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ),
    metadata: params.metadata,
  })

  // Add line items
  for (const item of params.lineItems) {
    await stripe.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      description: item.description,
      quantity: item.quantity,
      amount: item.unitAmount * item.quantity,
      currency: 'usd',
    })
  }

  return invoice
}

export async function finalizeAndSendInvoice(invoiceId: string) {
  // Finalize the invoice
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoiceId)

  // Send the invoice
  const sentInvoice = await stripe.invoices.sendInvoice(invoiceId)

  return sentInvoice
}

export async function voidStripeInvoice(invoiceId: string) {
  return stripe.invoices.voidInvoice(invoiceId)
}

export async function getStripeInvoice(invoiceId: string) {
  return stripe.invoices.retrieve(invoiceId)
}

// Payment Intent helpers for direct checkout
export async function createCheckoutSession(params: {
  invoiceId: string
  successUrl: string
  cancelUrl: string
  lineItems: Array<{
    name: string
    description?: string
    amount: number // in cents
    quantity: number
  }>
  customerEmail: string
  metadata?: Record<string, string>
}) {
  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: params.customerEmail,
    line_items: params.lineItems.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description,
        },
        unit_amount: item.amount,
      },
      quantity: item.quantity,
    })),
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      ...params.metadata,
      invoice_id: params.invoiceId,
    },
  })
}

// Webhook signature verification
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )
}

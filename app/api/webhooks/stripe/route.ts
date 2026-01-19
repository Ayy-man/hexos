import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { constructWebhookEvent, stripe } from '@/lib/stripe/server'
import { markInvoicePaid } from '@/lib/api/invoices'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * Events handled:
 * - checkout.session.completed - Payment via Checkout
 * - invoice.paid - Stripe hosted invoice paid
 * - invoice.payment_failed - Payment failed
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    console.error('Stripe webhook: Missing signature')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(body, signature)
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Get invoice_id from metadata
        const invoiceId = session.metadata?.invoice_id
        if (invoiceId) {
          await markInvoicePaid(invoiceId, session.payment_intent as string)
        }
        break
      }

      case 'invoice.paid': {
        const stripeInvoice = event.data.object as Stripe.Invoice

        // Find our invoice by Stripe invoice ID
        const supabase = createAdminClient()
        const { data: invoice } = await supabase
          .from('invoices')
          .select('id')
          .eq('stripe_invoice_id', stripeInvoice.id)
          .single()

        if (invoice) {
          await markInvoicePaid(invoice.id, stripeInvoice.id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const stripeInvoice = event.data.object as Stripe.Invoice

        // Find our invoice and update status
        const supabase2 = createAdminClient()
        const { data: invoice } = await supabase2
          .from('invoices')
          .select('id')
          .eq('stripe_invoice_id', stripeInvoice.id)
          .single()

        if (invoice) {
          // Could update to a 'payment_failed' status or send notification
          console.warn(`Payment failed for invoice ${invoice.id}`)
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Check if this is linked to an invoice via metadata
        const invoiceId = paymentIntent.metadata?.invoice_id
        if (invoiceId) {
          await markInvoicePaid(invoiceId, paymentIntent.id)
        }
        break
      }

      default:
        // Unhandled event types are silently ignored
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

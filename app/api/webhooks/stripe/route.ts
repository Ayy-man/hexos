import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { constructWebhookEvent, stripe } from '@/lib/stripe/server'
import { markInvoicePaid } from '@/lib/api/invoices'
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

  console.log(`Stripe webhook received: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Get invoice_id from metadata
        const invoiceId = session.metadata?.invoice_id
        if (invoiceId) {
          await markInvoicePaid(invoiceId, session.payment_intent as string)
          console.log(`Invoice ${invoiceId} marked as paid via Checkout`)
        }
        break
      }

      case 'invoice.paid': {
        const stripeInvoice = event.data.object as Stripe.Invoice

        // Find our invoice by Stripe invoice ID
        const { createClient: createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()
        const { data: invoice } = await supabase
          .from('invoices')
          .select('id')
          .eq('stripe_invoice_id', stripeInvoice.id)
          .single()

        if (invoice) {
          // Use Stripe invoice ID as reference
          await markInvoicePaid(invoice.id, stripeInvoice.id)
          console.log(`Invoice ${invoice.id} marked as paid via Stripe Invoice`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const stripeInvoice = event.data.object as Stripe.Invoice

        // Find our invoice and update status
        const { createClient: createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()
        const { data: invoice } = await supabase
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
          console.log(
            `Invoice ${invoiceId} marked as paid via PaymentIntent`
          )
        }
        break
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`)
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

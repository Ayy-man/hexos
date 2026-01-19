import { NextRequest, NextResponse } from 'next/server'
import { createInvoiceCheckoutSession } from '@/lib/api/invoices'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * POST /api/invoices/[id]/checkout
 * Create a Stripe Checkout session for an invoice
 * This is a public endpoint - clients use this to pay
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await req.json()

    const successUrl =
      body.success_url ||
      `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?invoice=${id}`
    const cancelUrl =
      body.cancel_url || `${process.env.NEXT_PUBLIC_APP_URL}/pay/${id}`

    const result = await createInvoiceCheckoutSession(id, successUrl, cancelUrl)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      sessionId: result.sessionId,
      url: result.url,
    })
  } catch (error) {
    console.error('POST /api/invoices/[id]/checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

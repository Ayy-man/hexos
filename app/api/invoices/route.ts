import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInvoices, createInvoice, getInvoiceStats } from '@/lib/api/invoices'
import type { CreateInvoiceInput } from '@/lib/types/invoices'

/**
 * GET /api/invoices
 * List all invoices with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id') || undefined
    const status = searchParams.get('status') || undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : undefined
    const includeStats = searchParams.get('include_stats') === 'true'

    const invoices = await getInvoices({ projectId, status, limit })

    if (includeStats) {
      const stats = await getInvoiceStats()
      return NextResponse.json({ invoices, stats })
    }

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('GET /api/invoices error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invoices
 * Create a new draft invoice
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin/internal role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'internal'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: CreateInvoiceInput = await req.json()

    // Validate required fields
    if (!body.client_name || !body.client_email || !body.line_items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: client_name, client_email, line_items' },
        { status: 400 }
      )
    }

    if (!body.due_date) {
      return NextResponse.json(
        { error: 'Missing required field: due_date' },
        { status: 400 }
      )
    }

    const result = await createInvoice(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ invoice: result.data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/invoices error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exportActivityLogs } from '@/lib/api/activity-logs'
import type { ActivityLogFilters } from '@/lib/types/activity-logs'

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin/internal
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'internal'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams
    const format = (searchParams.get('format') || 'csv') as 'csv' | 'json' | 'jsonl'
    const fromDate = searchParams.get('from') || undefined
    const toDate = searchParams.get('to') || undefined

    const filters: ActivityLogFilters = {}
    if (fromDate) filters.from_date = fromDate
    if (toDate) filters.to_date = toDate

    // Export logs
    const data = await exportActivityLogs(filters, format)

    // Set content type based on format
    const contentTypes: Record<string, string> = {
      csv: 'text/csv',
      json: 'application/json',
      jsonl: 'application/x-ndjson',
    }

    const filename = `activity-logs-${new Date().toISOString().split('T')[0]}.${format}`

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentTypes[format] || 'text/plain',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

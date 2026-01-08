import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('[DEBUG API] Starting...')

    const supabase = createClient()
    console.log('[DEBUG API] Admin client created')

    // Test 1: Simple count
    const { count, error: countError } = await supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true })

    console.log('[DEBUG API] Total count:', count, 'Error:', countError?.message)

    // Test 2: Pending admin/internal
    const { data, error } = await supabase
      .from('invitations')
      .select('id, email, type, status')
      .in('type', ['admin', 'internal'])
      .eq('status', 'pending')

    console.log('[DEBUG API] Filtered result:', {
      count: data?.length,
      error: error?.message,
      data
    })

    return NextResponse.json({
      totalInvitations: count,
      countError: countError?.message || null,
      pendingAdminInvitations: data?.length || 0,
      queryError: error?.message || null,
      invitations: data || [],
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('[DEBUG API] Exception:', e)
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

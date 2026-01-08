import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('invitations')
      .select('id, email, type, status, token')
      .in('type', ['admin', 'internal'])
      .eq('status', 'pending')

    return NextResponse.json({
      count: data?.length || 0,
      error: error?.message || null,
      invitations: data?.map(inv => ({
        email: inv.email,
        type: inv.type,
        link: `https://hexos-rho.vercel.app/invite/${inv.token}`
      })) || [],
    })
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Unknown error',
    }, { status: 500 })
  }
}

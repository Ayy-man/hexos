import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const headersList = await headers()

    // Get user if authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get user profile for role
    let userRole: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      userRole = profile?.role || null
    }

    // Use admin client to insert (bypasses RLS)
    const adminSupabase = createAdminClient()

    // Build search text
    const searchParts = [
      body.message,
      body.stack,
      body.action,
      body.component,
      user?.email,
    ].filter(Boolean)

    await adminSupabase.from('activity_logs').insert({
      user_id: user?.id || null,
      user_email: user?.email || null,
      user_role: userRole,

      action: body.action || 'error.uncaught',
      category: 'error',

      entity_type: body.entityType || null,
      entity_id: body.entityId || null,

      metadata: {
        page: body.page,
        severity: body.severity,
      },

      error_stack: body.stack || null,
      error_component: body.component || null,
      error_context: body.context || null,

      ip_address: headersList.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: headersList.get('user-agent') || null,
      request_path: body.page || null,

      browser: body.browser || null,
      os: body.os || null,
      screen_size: body.screenSize || null,

      search_text: searchParts.join(' '),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    // Don't throw - error logging should never crash
    console.error('[log-error API] Failed to log error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

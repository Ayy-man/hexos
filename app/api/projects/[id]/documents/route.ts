import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS
    let adminClient
    try {
      adminClient = createAdminClient()
      console.log('[API] Using admin client for documents')
    } catch (err) {
      console.error('[API] Failed to create admin client, falling back:', err)
      adminClient = supabase
    }

    // Check user's role - only admin, internal, dev can access gameplan documents
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    const allowedRoles = ['admin', 'internal', 'dev']
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({
        error: 'Access denied. Gameplan is only available for admin, internal, and dev roles.',
        code: 'ACCESS_DENIED'
      }, { status: 403 })
    }

    // Query documents using admin client (bypasses RLS after manual permission check)
    const { data: documents, error } = await adminClient
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true })

    if (error) {
      console.error('[API] Error fetching documents:', error)
      // Check if table doesn't exist (migration not run)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Documents table not found. Database migration may be pending.',
          code: 'TABLE_NOT_FOUND'
        }, { status: 500 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    console.error('[API] Unexpected error in documents route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

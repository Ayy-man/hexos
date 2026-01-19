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
    } catch {
      adminClient = supabase
    }

    // Get project with related users (dfy_partner, assigned_dev)
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select(`
        dfy_partner:profiles!dfy_partner_id(id, name, email),
        assigned_dev:profiles!assigned_dev_id(id, name, email)
      `)
      .eq('id', projectId)
      .single()

    if (projectError) {
      console.error('[API] Error fetching project:', projectError)
      return NextResponse.json({ error: projectError.message }, { status: 500 })
    }

    // Get deliverables for the project
    const { data: deliverables, error: deliverableError } = await adminClient
      .from('deliverables')
      .select('id, title, status, parent_id')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (deliverableError) {
      console.error('[API] Error fetching deliverables:', deliverableError)
      return NextResponse.json({ error: deliverableError.message }, { status: 500 })
    }

    // Build user list (deduplicated)
    const userMap = new Map<string, { type: string; id: string; name: string; email: string }>()

    // Add DFY partner
    const dfyRaw = project?.dfy_partner
    const dfy = Array.isArray(dfyRaw) ? dfyRaw[0] : dfyRaw
    if (dfy && dfy.id && !userMap.has(dfy.id)) {
      userMap.set(dfy.id, {
        type: 'user',
        id: dfy.id,
        name: dfy.name,
        email: dfy.email,
      })
    }

    // Add assigned dev
    const devRaw = project?.assigned_dev
    const dev = Array.isArray(devRaw) ? devRaw[0] : devRaw
    if (dev && dev.id && !userMap.has(dev.id)) {
      userMap.set(dev.id, {
        type: 'user',
        id: dev.id,
        name: dev.name,
        email: dev.email,
      })
    }

    // Build deliverable list
    const mentionableDeliverables = (deliverables || []).map((d) => ({
      type: 'deliverable',
      id: d.id,
      title: d.title,
      status: d.status,
      parent_id: d.parent_id,
    }))

    return NextResponse.json({
      users: Array.from(userMap.values()),
      deliverables: mentionableDeliverables,
    })
  } catch (error) {
    console.error('[API] Unexpected error in mentionables route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

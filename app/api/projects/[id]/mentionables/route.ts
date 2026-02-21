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

    // Get project user IDs (simple query, no FK joins)
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('dfy_partner_id, assigned_dev_id, client_id')
      .eq('id', projectId)
      .single()

    if (projectError) {
      console.error('[API] Error fetching project:', projectError)
    }

    // Collect all user IDs to fetch
    const userIds = new Set<string>()
    if (project?.dfy_partner_id) userIds.add(project.dfy_partner_id)
    if (project?.assigned_dev_id) userIds.add(project.assigned_dev_id)
    if (project?.client_id) userIds.add(project.client_id)

    // Fetch project-assigned profiles + admin/internal profiles + deliverables in parallel
    const [assignedResult, adminResult, deliverableResult] = await Promise.all([
      userIds.size > 0
        ? adminClient.from('profiles').select('id, name, email').in('id', Array.from(userIds))
        : Promise.resolve({ data: [], error: null }),
      adminClient.from('profiles').select('id, name, email').in('role', ['admin', 'internal']),
      adminClient.from('deliverables').select('id, title, status, parent_id').eq('project_id', projectId).order('sort_order', { ascending: true }),
    ])

    if (deliverableResult.error) {
      console.error('[API] Error fetching deliverables:', deliverableResult.error)
      return NextResponse.json({ error: deliverableResult.error.message }, { status: 500 })
    }

    // Build user list (deduplicated)
    const userMap = new Map<string, { type: string; id: string; name: string; email: string }>()

    for (const p of assignedResult.data || []) {
      if (p.id && !userMap.has(p.id)) {
        userMap.set(p.id, { type: 'user', id: p.id, name: p.name, email: p.email })
      }
    }

    for (const p of adminResult.data || []) {
      if (p.id && !userMap.has(p.id)) {
        userMap.set(p.id, { type: 'user', id: p.id, name: p.name, email: p.email })
      }
    }

    const deliverables = deliverableResult.data

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

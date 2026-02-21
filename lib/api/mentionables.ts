import { createClient as createAdminClient } from '@/lib/supabase/admin'

// Types for mentionable entities
export interface MentionableUser {
  type: 'user'
  id: string
  name: string
  email: string
  avatar_url?: string | null
}

export interface MentionableDeliverable {
  type: 'deliverable'
  id: string
  title: string
  status: string
  parent_id: string | null
}

export type Mentionable = MentionableUser | MentionableDeliverable

export interface ProjectMentionables {
  users: MentionableUser[]
  deliverables: MentionableDeliverable[]
}

// Get all mentionables for a project
export async function getProjectMentionables(projectId: string): Promise<ProjectMentionables> {
  // Use admin client to bypass RLS and access all profiles
  const adminClient = createAdminClient()

  // Get project user IDs (simple query, no FK joins)
  const { data: project, error: projectError } = await adminClient
    .from('projects')
    .select('dfy_partner_id, assigned_dev_id, client_id')
    .eq('id', projectId)
    .single()

  if (projectError) {
    console.error('[mentionables] Error fetching project:', projectError)
  }

  // Collect all user IDs to fetch
  const userIds = new Set<string>()
  if (project?.dfy_partner_id) userIds.add(project.dfy_partner_id)
  if (project?.assigned_dev_id) userIds.add(project.assigned_dev_id)
  if (project?.client_id) userIds.add(project.client_id)

  // Fetch project-assigned profiles + admin/internal profiles + deliverables in parallel
  const [assignedResult, adminResult, deliverableResult] = await Promise.all([
    userIds.size > 0
      ? adminClient.from('profiles').select('id, name, email, avatar_url').in('id', Array.from(userIds))
      : Promise.resolve({ data: [] as { id: string; name: string; email: string; avatar_url: string | null }[], error: null }),
    adminClient.from('profiles').select('id, name, email, avatar_url').in('role', ['admin', 'internal']),
    adminClient.from('deliverables').select('id, title, status, parent_id').eq('project_id', projectId).order('sort_order', { ascending: true }),
  ])

  if (adminResult.error) throw adminResult.error
  if (deliverableResult.error) throw deliverableResult.error

  // Build user list (deduplicated)
  const userMap = new Map<string, MentionableUser>()

  for (const p of assignedResult.data || []) {
    if (p.id && !userMap.has(p.id)) {
      userMap.set(p.id, { type: 'user', id: p.id, name: p.name, email: p.email, avatar_url: p.avatar_url })
    }
  }

  for (const p of adminResult.data || []) {
    if (p.id && !userMap.has(p.id)) {
      userMap.set(p.id, { type: 'user', id: p.id, name: p.name, email: p.email, avatar_url: p.avatar_url })
    }
  }

  const deliverables = deliverableResult.data

  // Build deliverable list
  const mentionableDeliverables: MentionableDeliverable[] = (deliverables || []).map((d) => ({
    type: 'deliverable',
    id: d.id,
    title: d.title,
    status: d.status,
    parent_id: d.parent_id,
  }))

  return {
    users: Array.from(userMap.values()),
    deliverables: mentionableDeliverables,
  }
}

// Search mentionables by query
export async function searchMentionables(
  projectId: string,
  query: string,
  type?: 'user' | 'deliverable'
): Promise<Mentionable[]> {
  const mentionables = await getProjectMentionables(projectId)
  const lowerQuery = query.toLowerCase()

  const results: Mentionable[] = []

  if (!type || type === 'user') {
    const matchingUsers = mentionables.users.filter(
      (u) =>
        u.name.toLowerCase().includes(lowerQuery) ||
        u.email.toLowerCase().includes(lowerQuery)
    )
    results.push(...matchingUsers)
  }

  if (!type || type === 'deliverable') {
    const matchingDeliverables = mentionables.deliverables.filter((d) =>
      d.title.toLowerCase().includes(lowerQuery)
    )
    results.push(...matchingDeliverables)
  }

  return results.slice(0, 10) // Limit results
}

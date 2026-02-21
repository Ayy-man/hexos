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

  // Get project with related users (dfy_partner, assigned_dev, client)
  const { data: project, error: projectError } = await adminClient
    .from('projects')
    .select(`
      dfy_partner:profiles!dfy_partner_id(id, name, email, avatar_url),
      assigned_dev:profiles!assigned_dev_id(id, name, email, avatar_url),
      client:profiles!client_id(id, name, email, avatar_url)
    `)
    .eq('id', projectId)
    .single()

  if (projectError) {
    console.error('[mentionables] Error fetching project:', projectError)
    // Don't throw — still fetch admin/internal profiles below
  }

  // Get all admin and internal users (they always have project access)
  const { data: adminProfiles, error: adminError } = await adminClient
    .from('profiles')
    .select('id, name, email, avatar_url')
    .in('role', ['admin', 'internal'])

  if (adminError) throw adminError

  // Get deliverables for the project
  const { data: deliverables, error: deliverableError } = await adminClient
    .from('deliverables')
    .select('id, title, status, parent_id')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (deliverableError) throw deliverableError

  // Build user list (deduplicated)
  const userMap = new Map<string, MentionableUser>()

  // Add DFY partner
  const dfyRaw = project?.dfy_partner
  const dfy = Array.isArray(dfyRaw) ? dfyRaw[0] : dfyRaw
  if (dfy && dfy.id && !userMap.has(dfy.id)) {
    userMap.set(dfy.id, {
      type: 'user',
      id: dfy.id,
      name: dfy.name,
      email: dfy.email,
      avatar_url: dfy.avatar_url,
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
      avatar_url: dev.avatar_url,
    })
  }

  // Add client
  const clientRaw = project?.client
  const client = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw
  if (client && client.id && !userMap.has(client.id)) {
    userMap.set(client.id, {
      type: 'user',
      id: client.id,
      name: client.name,
      email: client.email,
      avatar_url: client.avatar_url,
    })
  }

  // Add all admin/internal users (deduplication handled by Map)
  for (const adminProfile of adminProfiles || []) {
    if (adminProfile.id && !userMap.has(adminProfile.id)) {
      userMap.set(adminProfile.id, {
        type: 'user',
        id: adminProfile.id,
        name: adminProfile.name,
        email: adminProfile.email,
        avatar_url: adminProfile.avatar_url,
      })
    }
  }

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

import { createClient } from '@/lib/supabase/server'

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
  const supabase = await createClient()

  // Get project team members (from project_assignments)
  const { data: assignments, error: assignmentError } = await supabase
    .from('project_assignments')
    .select(`
      user:profiles!user_id(
        id,
        name,
        email,
        avatar_url
      )
    `)
    .eq('project_id', projectId)

  if (assignmentError) throw assignmentError

  // Get project owner from projects table
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      owner:profiles!dfy_partner_id(
        id,
        name,
        email,
        avatar_url
      )
    `)
    .eq('id', projectId)
    .single()

  if (projectError) throw projectError

  // Get deliverables for the project
  const { data: deliverables, error: deliverableError } = await supabase
    .from('deliverables')
    .select('id, title, status, parent_id')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (deliverableError) throw deliverableError

  // Build user list (deduplicated)
  const userMap = new Map<string, MentionableUser>()

  // Add assigned users
  for (const assignment of assignments || []) {
    // Supabase returns array for joined data - take first element
    const userRaw = assignment.user
    const user = Array.isArray(userRaw) ? userRaw[0] : userRaw

    if (user && user.id && !userMap.has(user.id)) {
      userMap.set(user.id, {
        type: 'user',
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
      })
    }
  }

  // Add project owner
  const ownerRaw = project?.owner
  const owner = Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw

  if (owner && owner.id && !userMap.has(owner.id)) {
    userMap.set(owner.id, {
      type: 'user',
      id: owner.id,
      name: owner.name,
      email: owner.email,
      avatar_url: owner.avatar_url,
    })
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

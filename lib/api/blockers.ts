import { createClient } from '@/lib/supabase/server'

// Types
export type BlockerStatus = 'reported' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed'
export type BlockerPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Blocker {
  id: string
  deliverable_id: string | null
  project_id: string
  title: string
  description: string | null
  priority: BlockerPriority
  status: BlockerStatus
  resolution_notes: string | null
  resolved_at: string | null
  resolved_by: string | null
  reported_by: string
  acknowledged_by: string | null
  acknowledged_at: string | null
  created_at: string
  updated_at: string
  reporter?: {
    id: string
    name: string
    email: string
  }
  resolver?: {
    id: string
    name: string
  }
  deliverable?: {
    id: string
    title: string
  }
  project?: {
    id: string
    project_name: string
  }
  escalated_to_dfy: boolean
  escalated_at: string | null
  escalated_by: string | null
  comments_count?: number
}

export interface BlockerComment {
  id: string
  blocker_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user?: {
    id: string
    name: string
  }
}

/**
 * Create a new blocker
 */
export async function createBlocker(params: {
  projectId: string
  deliverableId?: string
  title: string
  description?: string
  priority?: BlockerPriority
}): Promise<Blocker> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('blockers')
    .insert({
      project_id: params.projectId,
      deliverable_id: params.deliverableId || null,
      title: params.title,
      description: params.description || null,
      priority: params.priority || 'medium',
      reported_by: user.id,
    })
    .select(`
      *,
      reporter:profiles!reported_by(id, name, email),
      deliverable:deliverables(id, title),
      project:projects(id, project_name)
    `)
    .single()

  if (error) throw error
  return normalizeBlockerRelations(data)
}

/**
 * Get blockers for a project
 */
export async function getBlockersForProject(projectId: string): Promise<Blocker[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blockers')
    .select(`
      *,
      reporter:profiles!reported_by(id, name, email),
      resolver:profiles!resolved_by(id, name),
      deliverable:deliverables(id, title)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeBlockerRelations)
}

/**
 * Get blockers reported by current user
 */
export async function getMyReportedBlockers(): Promise<Blocker[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('blockers')
    .select(`
      *,
      deliverable:deliverables(id, title),
      project:projects(id, project_name)
    `)
    .eq('reported_by', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeBlockerRelations)
}

/**
 * Get all blockers (admin view — includes resolved/closed)
 */
export async function getAllBlockers(): Promise<Blocker[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blockers')
    .select(`
      *,
      reporter:profiles!reported_by(id, name, email),
      resolver:profiles!resolved_by(id, name),
      deliverable:deliverables(id, title),
      project:projects(id, project_name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeBlockerRelations)
}

/**
 * Get all active blockers (admin view)
 */
export async function getAllActiveBlockers(): Promise<Blocker[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blockers')
    .select(`
      *,
      reporter:profiles!reported_by(id, name, email),
      deliverable:deliverables(id, title),
      project:projects(id, project_name)
    `)
    .not('status', 'in', '("resolved","closed")')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []).map(normalizeBlockerRelations)
}

/**
 * Get a single blocker by ID
 */
export async function getBlocker(blockerId: string): Promise<Blocker | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blockers')
    .select(`
      *,
      reporter:profiles!reported_by(id, name, email),
      resolver:profiles!resolved_by(id, name),
      deliverable:deliverables(id, title),
      project:projects(id, project_name)
    `)
    .eq('id', blockerId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null

  return normalizeBlockerRelations(data)
}

/**
 * Update blocker status
 */
export async function updateBlockerStatus(
  blockerId: string,
  status: BlockerStatus,
  notes?: string
): Promise<Blocker> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const updates: Record<string, unknown> = { status }

  if (status === 'acknowledged') {
    updates.acknowledged_by = user.id
    updates.acknowledged_at = new Date().toISOString()
  } else if (status === 'resolved' || status === 'closed') {
    updates.resolved_by = user.id
    updates.resolved_at = new Date().toISOString()
    if (notes) updates.resolution_notes = notes
  }

  const { data, error } = await supabase
    .from('blockers')
    .update(updates)
    .eq('id', blockerId)
    .select(`
      *,
      reporter:profiles!reported_by(id, name, email),
      resolver:profiles!resolved_by(id, name),
      deliverable:deliverables(id, title),
      project:projects(id, project_name)
    `)
    .single()

  if (error) throw error
  return normalizeBlockerRelations(data)
}

/**
 * Update blocker details (title, description, priority)
 */
export async function updateBlocker(
  blockerId: string,
  updates: { title?: string; description?: string; priority?: BlockerPriority }
): Promise<Blocker> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blockers')
    .update(updates)
    .eq('id', blockerId)
    .select(`
      *,
      reporter:profiles!reported_by(id, name, email),
      deliverable:deliverables(id, title)
    `)
    .single()

  if (error) throw error
  return normalizeBlockerRelations(data)
}

/**
 * Escalate a blocker to the DFY partner
 */
export async function escalateBlockerToDfy(blockerId: string): Promise<Blocker> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('blockers')
    .update({
      escalated_to_dfy: true,
      escalated_at: new Date().toISOString(),
      escalated_by: user.id,
    })
    .eq('id', blockerId)
    .select(`
      *,
      reporter:profiles!reported_by(id, name, email),
      deliverable:deliverables(id, title),
      project:projects(id, project_name, dfy_partner_id)
    `)
    .single()

  if (error) throw error
  return normalizeBlockerRelations(data)
}

/**
 * Get blockers escalated to DFY partner
 */
export async function getEscalatedBlockersForDfy(): Promise<Blocker[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  // Get projects where this user is the DFY partner
  const { data: myProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('dfy_partner_id', user.id)

  if (!myProjects || myProjects.length === 0) return []

  const projectIds = myProjects.map(p => p.id)

  const { data, error } = await supabase
    .from('blockers')
    .select(`
      *,
      reporter:profiles!reported_by(id, name, email),
      deliverable:deliverables(id, title),
      project:projects(id, project_name)
    `)
    .eq('escalated_to_dfy', true)
    .not('status', 'in', '("resolved","closed")')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeBlockerRelations)
}

/**
 * Delete a blocker
 */
export async function deleteBlocker(blockerId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('blockers')
    .delete()
    .eq('id', blockerId)

  if (error) throw error
}

/**
 * Add a comment to a blocker
 */
export async function addBlockerComment(blockerId: string, content: string): Promise<BlockerComment> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('blocker_comments')
    .insert({
      blocker_id: blockerId,
      user_id: user.id,
      content,
    })
    .select(`
      *,
      user:profiles(id, name)
    `)
    .single()

  if (error) throw error
  return normalizeCommentRelations(data)
}

/**
 * Get comments for a blocker
 */
export async function getBlockerComments(blockerId: string): Promise<BlockerComment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blocker_comments')
    .select(`
      *,
      user:profiles(id, name)
    `)
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []).map(normalizeCommentRelations)
}

/**
 * Update a comment
 */
export async function updateBlockerComment(commentId: string, content: string): Promise<BlockerComment> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blocker_comments')
    .update({ content })
    .eq('id', commentId)
    .select(`
      *,
      user:profiles(id, name)
    `)
    .single()

  if (error) throw error
  return normalizeCommentRelations(data)
}

/**
 * Delete a comment
 */
export async function deleteBlockerComment(commentId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('blocker_comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
}

/**
 * Get blocker counts by status for a project
 */
export async function getBlockerCounts(projectId: string): Promise<Record<BlockerStatus, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blockers')
    .select('status')
    .eq('project_id', projectId)

  if (error) throw error

  const counts: Record<BlockerStatus, number> = {
    reported: 0,
    acknowledged: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  }

  for (const blocker of data || []) {
    counts[blocker.status as BlockerStatus]++
  }

  return counts
}

// Get active blocker counts by priority (for sidebar hover preview)
export async function getActiveBlockerCountsByPriority() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blockers')
    .select('priority')
    .not('status', 'in', '("resolved","closed")')
  if (!data) return { critical: 0, high: 0, medium: 0, low: 0 }
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const row of data) {
    const p = row.priority as keyof typeof counts
    if (p in counts) counts[p]++
  }
  return counts
}

// Get active blockers by priority (for sidebar hover drill-down)
export async function getActiveBlockersByPriority(priority: string, limit = 5) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blockers')
    .select('id, title, priority, projects(project_name)')
    .eq('priority', priority)
    .not('status', 'in', '("resolved","closed")')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

// Helper to normalize relations from Supabase array format
function normalizeBlockerRelations(blocker: Record<string, unknown>): Blocker {
  const reporter = Array.isArray(blocker.reporter)
    ? blocker.reporter[0]
    : blocker.reporter
  const resolver = Array.isArray(blocker.resolver)
    ? blocker.resolver[0]
    : blocker.resolver
  const deliverable = Array.isArray(blocker.deliverable)
    ? blocker.deliverable[0]
    : blocker.deliverable
  const project = Array.isArray(blocker.project)
    ? blocker.project[0]
    : blocker.project

  return {
    ...blocker,
    reporter,
    resolver,
    deliverable,
    project,
  } as Blocker
}

function normalizeCommentRelations(comment: Record<string, unknown>): BlockerComment {
  const user = Array.isArray(comment.user)
    ? comment.user[0]
    : comment.user

  return {
    ...comment,
    user,
  } as BlockerComment
}

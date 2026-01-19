import { createClient } from '@/lib/supabase/server'
import { createNotification } from './notifications'
import type {
  ScopeBaseline,
  ScopeBaselineWithUser,
  ScopeChange,
  ScopeChangeWithRelations,
  ScopeChangeComment,
  ScopeChangeCommentWithUser,
  ScopeMetrics,
  ScopeComparison,
  FlagScopeChangeInput,
  AutoFlagScopeChangeInput,
  ScopeChangeFilters,
  DeliverableSnapshot,
} from '@/lib/types/scope-monitoring'

// Re-export types for convenience
export type {
  ScopeBaseline,
  ScopeBaselineWithUser,
  ScopeChange,
  ScopeChangeWithRelations,
  ScopeChangeComment,
  ScopeChangeCommentWithUser,
  ScopeMetrics,
  ScopeComparison,
  FlagScopeChangeInput,
  AutoFlagScopeChangeInput,
  ScopeChangeFilters,
  DeliverableSnapshot,
}

// ============================================================================
// BASELINE FUNCTIONS
// ============================================================================

/**
 * Capture scope baseline for a project (called at sign-off)
 */
export async function captureBaseline(
  projectId: string,
  capturedBy: string
): Promise<ScopeBaseline> {
  const supabase = await createClient()

  // Call the database function
  const { data, error } = await supabase.rpc('capture_scope_baseline', {
    p_project_id: projectId,
    p_user_id: capturedBy,
  })

  if (error) throw error

  // Fetch the created/updated baseline
  const baseline = await getBaseline(projectId)
  if (!baseline) {
    throw new Error('Failed to capture baseline')
  }

  return baseline
}

/**
 * Get baseline for a project
 */
export async function getBaseline(projectId: string): Promise<ScopeBaseline | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scope_baselines')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) {
    console.error('[getBaseline] Error:', error)
    return null
  }

  if (!data) return null

  return {
    ...data,
    deliverables_snapshot: (data.deliverables_snapshot || []) as DeliverableSnapshot[],
  } as ScopeBaseline
}

/**
 * Get baseline with user details
 */
export async function getBaselineWithUser(projectId: string): Promise<ScopeBaselineWithUser | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scope_baselines')
    .select(`
      *,
      capturer:profiles!captured_by(id, name, email)
    `)
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) {
    console.error('[getBaselineWithUser] Error:', error)
    return null
  }

  if (!data) return null

  // Normalize the capturer relation (may come as array)
  const capturer = Array.isArray(data.capturer) ? data.capturer[0] : data.capturer

  return {
    ...data,
    deliverables_snapshot: (data.deliverables_snapshot || []) as DeliverableSnapshot[],
    capturer: capturer || null,
  } as ScopeBaselineWithUser
}

/**
 * Check if project has a baseline
 */
export async function hasBaseline(projectId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('has_scope_baseline', {
    p_project_id: projectId,
  })

  if (error) {
    console.error('[hasBaseline] Error:', error)
    return false
  }

  return data === true
}

// ============================================================================
// SCOPE CHANGE FUNCTIONS
// ============================================================================

/**
 * Flag a scope change (manual)
 */
export async function flagScopeChange(
  input: FlagScopeChangeInput,
  flaggedBy: string,
  email: string,
  role: string
): Promise<ScopeChange> {
  const supabase = await createClient()

  // Get baseline if exists
  const baseline = await getBaseline(input.project_id)

  // Get baseline deliverable snapshot if affecting a specific deliverable
  let baselineDeliverableSnapshot: DeliverableSnapshot | null = null
  if (input.affected_deliverable_id && baseline) {
    const snapshots = baseline.deliverables_snapshot as DeliverableSnapshot[]
    baselineDeliverableSnapshot =
      snapshots.find((d) => d.id === input.affected_deliverable_id) || null
  }

  const { data, error } = await supabase
    .from('scope_changes')
    .insert({
      project_id: input.project_id,
      trigger_type: input.trigger_type,
      description: input.description,
      status: 'pending_review',
      request_type: input.request_type || null,
      requested_by: flaggedBy,
      affected_deliverable_id: input.affected_deliverable_id || null,
      change_delta: input.change_delta || null,
      hours_delta: input.hours_delta || null,
      cost_delta: input.cost_delta || null,
      timeline_delta_days: input.timeline_delta_days || null,
      baseline_id: baseline?.id || null,
      baseline_deliverable_snapshot: baselineDeliverableSnapshot || input.baseline_deliverable_snapshot || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as ScopeChange
}

/**
 * Auto-flag scope change (called from deliverable actions)
 */
export async function autoFlagScopeChange(
  input: AutoFlagScopeChangeInput,
  userId: string,
  email: string,
  role: string
): Promise<ScopeChange | null> {
  const supabase = await createClient()

  // Only auto-flag if baseline exists
  const baseline = await getBaseline(input.project_id)
  if (!baseline) return null

  // Get baseline deliverable snapshot
  const snapshots = baseline.deliverables_snapshot as DeliverableSnapshot[]
  const baselineDeliverable = snapshots.find((d) => d.id === input.affected_deliverable_id)

  // Generate description based on trigger type
  let description = ''
  switch (input.trigger_type) {
    case 'deliverable_modified':
      description = `Deliverable "${input.deliverable_title}" was modified: ${input.change_delta.field} changed from "${input.change_delta.before}" to "${input.change_delta.after}"`
      break
    case 'hours_increased':
      description = `Hours increased on "${input.deliverable_title}": ${input.change_delta.before}h → ${input.change_delta.after}h`
      break
    case 'timeline_extended':
      description = `Timeline extended on "${input.deliverable_title}": due date changed from ${input.change_delta.before || 'unset'} to ${input.change_delta.after}`
      break
    case 'deliverable_added':
      description = `New deliverable added: "${input.deliverable_title}"`
      break
    case 'deliverable_removed':
      description = `Deliverable removed: "${input.deliverable_title}"`
      break
    default:
      description = `Scope change detected on "${input.deliverable_title}"`
  }

  // Determine request type based on trigger
  let requestType: 'clarification' | 'new_scope' | 'reduction' | 'timeline_change' | null = null
  if (input.trigger_type === 'deliverable_added' || input.trigger_type === 'hours_increased') {
    requestType = 'new_scope'
  } else if (input.trigger_type === 'deliverable_removed') {
    requestType = 'reduction'
  } else if (input.trigger_type === 'timeline_extended') {
    requestType = 'timeline_change'
  } else {
    requestType = 'clarification'
  }

  const { data, error } = await supabase
    .from('scope_changes')
    .insert({
      project_id: input.project_id,
      trigger_type: input.trigger_type,
      description,
      status: 'pending_review',
      request_type: requestType,
      requested_by: userId,
      affected_deliverable_id: input.affected_deliverable_id,
      change_delta: input.change_delta,
      hours_delta: input.hours_delta || null,
      timeline_delta_days: input.timeline_delta_days || null,
      baseline_id: baseline.id,
      baseline_deliverable_snapshot: baselineDeliverable || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as ScopeChange
}

/**
 * Get scope changes for a project
 */
export async function getScopeChanges(
  projectId: string,
  filters?: ScopeChangeFilters
): Promise<ScopeChangeWithRelations[]> {
  const supabase = await createClient()

  let query = supabase
    .from('scope_changes')
    .select(`
      *,
      requester:profiles!requested_by(id, name, email, role),
      approver:profiles!approved_by(id, name, email, role),
      rejecter:profiles!rejected_by(id, name, email, role),
      affected_deliverable:deliverables!affected_deliverable_id(id, title)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.request_type && filters.request_type !== 'all') {
    query = query.eq('request_type', filters.request_type)
  }
  if (filters?.trigger_type && filters.trigger_type !== 'all') {
    query = query.eq('trigger_type', filters.trigger_type)
  }
  if (filters?.from_date) {
    query = query.gte('created_at', filters.from_date)
  }
  if (filters?.to_date) {
    query = query.lte('created_at', filters.to_date)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getScopeChanges] Error:', error)
    return []
  }

  // Normalize relations (may come as arrays from Supabase)
  return (data || []).map((change) => normalizeRelations(change) as unknown as ScopeChangeWithRelations)
}

/**
 * Get scope change details by ID
 */
export async function getScopeChangeDetails(id: string): Promise<ScopeChangeWithRelations | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scope_changes')
    .select(`
      *,
      requester:profiles!requested_by(id, name, email, role),
      approver:profiles!approved_by(id, name, email, role),
      rejecter:profiles!rejected_by(id, name, email, role),
      affected_deliverable:deliverables!affected_deliverable_id(id, title)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[getScopeChangeDetails] Error:', error)
    return null
  }

  if (!data) return null

  return normalizeRelations(data) as unknown as ScopeChangeWithRelations
}

/**
 * Approve a scope change (admin only)
 */
export async function approveScopeChange(
  id: string,
  approvedBy: string,
  notes?: string
): Promise<ScopeChange> {
  const supabase = await createClient()

  // Get scope change details for notification
  const { data: existing } = await supabase
    .from('scope_changes')
    .select('project_id, requested_by, description')
    .eq('id', id)
    .single()

  const updateData: Record<string, unknown> = {
    status: 'approved',
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
    resolved_at: new Date().toISOString(),
    resolved_by: approvedBy,
    updated_at: new Date().toISOString(),
  }

  if (notes) {
    updateData.description = notes
  }

  const { data, error } = await supabase
    .from('scope_changes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Notify the requester that their scope change was approved
  if (existing?.requested_by && existing.requested_by !== approvedBy) {
    try {
      await createNotification({
        userId: existing.requested_by,
        type: 'scope_change_approved',
        title: 'Scope Change Approved',
        message: `Your scope change request has been approved: "${existing.description?.substring(0, 100) || 'Scope change'}"`,
        projectId: existing.project_id,
        actorId: approvedBy,
      })
    } catch (notifyErr) {
      console.error('[approveScopeChange] Failed to create notification:', notifyErr)
    }
  }

  return data as ScopeChange
}

/**
 * Reject a scope change (admin only)
 */
export async function rejectScopeChange(
  id: string,
  rejectedBy: string,
  reason: string
): Promise<ScopeChange> {
  const supabase = await createClient()

  // Get scope change details for notification
  const { data: existing } = await supabase
    .from('scope_changes')
    .select('project_id, requested_by, description')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('scope_changes')
    .update({
      status: 'rejected',
      rejected_by: rejectedBy,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
      resolved_at: new Date().toISOString(),
      resolved_by: rejectedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Notify the requester that their scope change was rejected
  if (existing?.requested_by && existing.requested_by !== rejectedBy) {
    try {
      await createNotification({
        userId: existing.requested_by,
        type: 'scope_change_rejected',
        title: 'Scope Change Rejected',
        message: `Your scope change request was rejected: "${reason}"`,
        projectId: existing.project_id,
        actorId: rejectedBy,
      })
    } catch (notifyErr) {
      console.error('[rejectScopeChange] Failed to create notification:', notifyErr)
    }
  }

  return data as ScopeChange
}

/**
 * Get pending scope changes count for a project
 */
export async function getPendingScopeChangesCount(projectId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('scope_changes')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'pending_review')

  if (error) throw error
  return count || 0
}

// ============================================================================
// COMMENTS FUNCTIONS
// ============================================================================

/**
 * Add comment to a scope change
 */
export async function addScopeChangeComment(
  scopeChangeId: string,
  userId: string,
  content: string
): Promise<ScopeChangeComment> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scope_change_comments')
    .insert({
      scope_change_id: scopeChangeId,
      user_id: userId,
      content,
    })
    .select()
    .single()

  if (error) throw error
  return data as ScopeChangeComment
}

/**
 * Get comments for a scope change
 */
export async function getScopeChangeComments(
  scopeChangeId: string
): Promise<ScopeChangeCommentWithUser[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scope_change_comments')
    .select(`
      *,
      user:profiles!user_id(id, name, email, role)
    `)
    .eq('scope_change_id', scopeChangeId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data || []).map((comment) => {
    const user = Array.isArray(comment.user) ? comment.user[0] : comment.user
    return { ...comment, user } as ScopeChangeCommentWithUser
  })
}

/**
 * Delete a scope change comment
 */
export async function deleteScopeChangeComment(commentId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('scope_change_comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
}

// ============================================================================
// METRICS & COMPARISON FUNCTIONS
// ============================================================================

/**
 * Get scope metrics for a project
 */
export async function getScopeMetrics(projectId: string): Promise<ScopeMetrics> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_scope_metrics', {
    p_project_id: projectId,
  })

  if (error) {
    console.error('[getScopeMetrics] Error:', error)
    // Return default metrics on error
    return {
      total_changes: 0,
      pending_changes: 0,
      approved_changes: 0,
      rejected_changes: 0,
      net_hours_delta: 0,
      net_cost_delta: 0,
      has_baseline: false,
    }
  }

  // RPC returns an array with one row
  const metrics = Array.isArray(data) ? data[0] : data

  if (!metrics) {
    return {
      total_changes: 0,
      pending_changes: 0,
      approved_changes: 0,
      rejected_changes: 0,
      net_hours_delta: 0,
      net_cost_delta: 0,
      has_baseline: false,
    }
  }

  return {
    total_changes: Number(metrics.total_changes) || 0,
    pending_changes: Number(metrics.pending_changes) || 0,
    approved_changes: Number(metrics.approved_changes) || 0,
    rejected_changes: Number(metrics.rejected_changes) || 0,
    net_hours_delta: Number(metrics.net_hours_delta) || 0,
    net_cost_delta: Number(metrics.net_cost_delta) || 0,
    has_baseline: metrics.has_baseline === true,
  }
}

/**
 * Compare current state to baseline
 */
export async function compareToBaseline(projectId: string): Promise<ScopeComparison> {
  const supabase = await createClient()

  // Get baseline
  const baseline = await getBaseline(projectId)

  // Get current deliverables
  const { data: currentDeliverables, error } = await supabase
    .from('deliverables')
    .select('id, title, description, status, estimated_hours, start_date, due_date, sort_order')
    .eq('project_id', projectId)
    .order('sort_order')

  if (error) throw error

  const current = {
    deliverables: (currentDeliverables || []) as DeliverableSnapshot[],
    total_estimated_hours: currentDeliverables?.reduce(
      (sum, d) => sum + (d.estimated_hours || 0),
      0
    ) || 0,
    deliverable_count: currentDeliverables?.length || 0,
  }

  if (!baseline) {
    return {
      baseline: null,
      current,
      differences: {
        hours_delta: 0,
        deliverable_delta: 0,
        added: [],
        removed: [],
        modified: [],
      },
    }
  }

  const baselineSnapshots = baseline.deliverables_snapshot as DeliverableSnapshot[]
  const baselineIds = new Set(baselineSnapshots.map((d) => d.id))
  const currentIds = new Set(current.deliverables.map((d) => d.id))

  // Find added deliverables (in current but not in baseline)
  const added = current.deliverables.filter((d) => !baselineIds.has(d.id))

  // Find removed deliverables (in baseline but not in current)
  const removed = baselineSnapshots.filter((d) => !currentIds.has(d.id))

  // Find modified deliverables
  const modified: ScopeComparison['differences']['modified'] = []
  for (const currentDel of current.deliverables) {
    const baselineDel = baselineSnapshots.find((d) => d.id === currentDel.id)
    if (baselineDel) {
      const changes: string[] = []
      if (baselineDel.title !== currentDel.title) changes.push('title')
      if (baselineDel.description !== currentDel.description) changes.push('description')
      if (baselineDel.estimated_hours !== currentDel.estimated_hours) changes.push('estimated_hours')
      if (baselineDel.due_date !== currentDel.due_date) changes.push('due_date')
      if (baselineDel.start_date !== currentDel.start_date) changes.push('start_date')

      if (changes.length > 0) {
        modified.push({ baseline: baselineDel, current: currentDel, changes })
      }
    }
  }

  return {
    baseline,
    current,
    differences: {
      hours_delta: current.total_estimated_hours - (baseline.total_estimated_hours || 0),
      deliverable_delta: current.deliverable_count - baseline.deliverable_count,
      added,
      removed,
      modified,
    },
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeRelations(data: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...data }

  // Normalize array relations to single objects
  const relations = ['requester', 'approver', 'rejecter', 'affected_deliverable']
  for (const rel of relations) {
    if (Array.isArray(normalized[rel])) {
      normalized[rel] = normalized[rel][0] || null
    }
  }

  return normalized
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  flagScopeChange,
  approveScopeChange,
  rejectScopeChange,
  addScopeChangeComment,
  captureBaseline,
  getScopeChanges,
  getScopeChangeDetails,
  getScopeChangeComments,
  getScopeMetrics,
  getBaselineWithUser,
  compareToBaseline,
  getPendingScopeChangesCount,
} from '@/lib/api/scope-monitoring'
import { createNotification } from '@/lib/api/notifications'
import type {
  FlagScopeChangeInput,
  ScopeChangeWithRelations,
  ScopeChangeCommentWithUser,
  ScopeMetrics,
  ScopeBaselineWithUser,
  ScopeComparison,
  ScopeChangeFilters,
} from '@/lib/types/scope-monitoring'

// ============================================
// Scope Change Actions
// ============================================

/**
 * Flag a scope change (available to any role with project access)
 */
export async function flagScopeChangeAction(
  input: FlagScopeChangeInput
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Profile not found')

  // Flag the scope change
  const scopeChange = await flagScopeChange(
    input,
    user.id,
    profile.email,
    profile.role
  )

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: input.project_id,
    user_id: user.id,
    action: 'scope_change_flagged',
    details: {
      scope_change_id: scopeChange.id,
      trigger_type: input.trigger_type,
      request_type: input.request_type,
      description: input.description,
    },
  })

  // Notify admins about the scope change
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'internal'])

  if (admins) {
    for (const admin of admins) {
      if (admin.id !== user.id) {
        await createNotification({
          userId: admin.id,
          type: 'scope_change_flagged' as never, // Type will be added
          title: 'Scope Change Flagged',
          message: input.description,
          projectId: input.project_id,
          actorId: user.id,
        })
      }
    }
  }

  revalidatePath(`/projects/${input.project_id}`)
}

/**
 * Approve a scope change (admin/internal only)
 */
export async function approveScopeChangeAction(
  scopeChangeId: string,
  projectId: string,
  notes?: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'internal'].includes(profile.role)) {
    throw new Error('Only admins can approve scope changes')
  }

  // Get scope change details for notification
  const scopeChangeDetails = await getScopeChangeDetails(scopeChangeId)
  if (!scopeChangeDetails) throw new Error('Scope change not found')

  // Approve the scope change
  await approveScopeChange(scopeChangeId, user.id, notes)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'scope_change_approved',
    details: {
      scope_change_id: scopeChangeId,
      notes,
    },
  })

  // Notify the requester
  if (scopeChangeDetails.requested_by && scopeChangeDetails.requested_by !== user.id) {
    await createNotification({
      userId: scopeChangeDetails.requested_by,
      type: 'scope_change_approved' as never,
      title: 'Scope Change Approved',
      message: `Your scope change request has been approved${notes ? `: ${notes}` : ''}`,
      projectId,
      actorId: user.id,
    })
  }

  revalidatePath(`/projects/${projectId}`)
}

/**
 * Reject a scope change (admin/internal only)
 */
export async function rejectScopeChangeAction(
  scopeChangeId: string,
  projectId: string,
  reason: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'internal'].includes(profile.role)) {
    throw new Error('Only admins can reject scope changes')
  }

  // Get scope change details for notification
  const scopeChangeDetails = await getScopeChangeDetails(scopeChangeId)
  if (!scopeChangeDetails) throw new Error('Scope change not found')

  // Reject the scope change
  await rejectScopeChange(scopeChangeId, user.id, reason)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'scope_change_rejected',
    details: {
      scope_change_id: scopeChangeId,
      reason,
    },
  })

  // Notify the requester
  if (scopeChangeDetails.requested_by && scopeChangeDetails.requested_by !== user.id) {
    await createNotification({
      userId: scopeChangeDetails.requested_by,
      type: 'scope_change_rejected' as never,
      title: 'Scope Change Rejected',
      message: `Your scope change request was rejected: ${reason}`,
      projectId,
      actorId: user.id,
    })
  }

  revalidatePath(`/projects/${projectId}`)
}

/**
 * Add comment to a scope change
 */
export async function addScopeChangeCommentAction(
  scopeChangeId: string,
  projectId: string,
  content: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await addScopeChangeComment(scopeChangeId, user.id, content)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'scope_change_comment_added',
    details: {
      scope_change_id: scopeChangeId,
    },
  })

  revalidatePath(`/projects/${projectId}`)
}

/**
 * Capture baseline for a project (called internally on sign-off)
 */
export async function captureBaselineAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await captureBaseline(projectId, user.id)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'scope_baseline_captured',
    details: {},
  })

  revalidatePath(`/projects/${projectId}`)
}

// ============================================
// Data Fetching Actions (for client components)
// ============================================

export async function getScopeChangesAction(
  projectId: string,
  filters?: ScopeChangeFilters
): Promise<ScopeChangeWithRelations[]> {
  return getScopeChanges(projectId, filters)
}

export async function getScopeChangeDetailsAction(
  scopeChangeId: string
): Promise<ScopeChangeWithRelations | null> {
  return getScopeChangeDetails(scopeChangeId)
}

export async function getScopeChangeCommentsAction(
  scopeChangeId: string
): Promise<ScopeChangeCommentWithUser[]> {
  return getScopeChangeComments(scopeChangeId)
}

export async function getScopeMetricsAction(
  projectId: string
): Promise<ScopeMetrics> {
  return getScopeMetrics(projectId)
}

export async function getBaselineAction(
  projectId: string
): Promise<ScopeBaselineWithUser | null> {
  return getBaselineWithUser(projectId)
}

export async function compareToBaselineAction(
  projectId: string
): Promise<ScopeComparison> {
  return compareToBaseline(projectId)
}

export async function getPendingScopeChangesCountAction(
  projectId: string
): Promise<number> {
  return getPendingScopeChangesCount(projectId)
}

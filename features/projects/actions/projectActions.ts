'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  canCompleteRequirement,
  updateRequirementDependencies,
} from '@/lib/api/project-requirements'
import { checkAndNotifyUnblockedRequirements } from '@/lib/api/requirement-notifications'
import type { ProjectStatus } from '@/lib/api/projects'

// ============================================
// Project Status Transitions
// ============================================

/**
 * Generic action to update project status.
 * Logs the transition to activity_log with old and new status.
 */
export async function updateProjectStatusAction(
  projectId: string,
  newStatus: ProjectStatus,
  notes?: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get current status for logging
  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single()

  if (!project) throw new Error('Project not found')

  const oldStatus = project.status

  // Update the status
  const { error } = await supabase
    .from('projects')
    .update({ status: newStatus })
    .eq('id', projectId)

  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'status_changed',
    details: {
      old_status: oldStatus,
      new_status: newStatus,
      notes: notes || null,
    },
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
}

// ============================================
// Deliverables Sign-off Flow
// ============================================

export async function confirmDeliverablesAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('projects')
    .update({
      status: 'deliverables_pending',
      deliverables_confirmed_at: new Date().toISOString(),
      deliverables_confirmed_by: user.id,
    })
    .eq('id', projectId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'deliverables_confirmed',
    details: {},
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function sendForSignoffAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('projects')
    .update({
      status: 'awaiting_signoff',
      signoff_sent_at: new Date().toISOString(),
      signoff_sent_by: user.id,
    })
    .eq('id', projectId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'signoff_sent',
    details: {},
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function signOffDeliverablesAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('projects')
    .update({
      status: 'signed_off',
      signed_off_at: new Date().toISOString(),
      signed_off_by: user.id,
    })
    .eq('id', projectId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'signed_off',
    details: {},
  })

  revalidatePath(`/projects/${projectId}`)
}

// ============================================
// Requirements
// ============================================

export async function updateRequirementStatusAction(
  requirementId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // If trying to complete, check dependencies first
  if (status === 'completed') {
    const { canComplete, blockedBy } = await canCompleteRequirement(requirementId)
    if (!canComplete) {
      return {
        success: false,
        error: `Cannot complete: waiting on ${blockedBy.join(', ')}`,
      }
    }
  }

  const updateData: Record<string, unknown> = { status }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
    updateData.completed_by = user.id
  } else {
    updateData.completed_at = null
    updateData.completed_by = null
  }

  const { data: requirement } = await supabase
    .from('project_requirements')
    .update(updateData)
    .eq('id', requirementId)
    .select('project_id')
    .single()

  if (requirement) {
    // Log activity
    await supabase.from('activity_log').insert({
      project_id: requirement.project_id,
      user_id: user.id,
      action: status === 'completed' ? 'requirement_completed' : 'requirement_updated',
      details: { requirement_id: requirementId, status },
    })

    revalidatePath(`/projects/${requirement.project_id}`)

    // Check for newly unblocked requirements and send notifications
    if (status === 'completed') {
      await checkAndNotifyUnblockedRequirements(requirementId)
    }
  }

  return { success: true }
}

// Update dependencies for a requirement
export async function updateRequirementDependenciesAction(
  requirementId: string,
  dependsOnIds: string[]
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await updateRequirementDependencies(requirementId, dependsOnIds)

  // Get project ID for revalidation and activity log
  const { data: requirement } = await supabase
    .from('project_requirements')
    .select('project_id')
    .eq('id', requirementId)
    .single()

  if (requirement) {
    // Log activity
    await supabase.from('activity_log').insert({
      project_id: requirement.project_id,
      user_id: user.id,
      action: 'requirement_dependencies_updated',
      details: { requirement_id: requirementId, depends_on_ids: dependsOnIds },
    })

    revalidatePath(`/projects/${requirement.project_id}`)
  }
}

// ============================================
// Dev Assignment
// ============================================

export async function assignDevAction(projectId: string, devId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get dev name for activity log
  const { data: dev } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', devId)
    .single()

  await supabase
    .from('projects')
    .update({ assigned_dev_id: devId })
    .eq('id', projectId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'dev_assigned',
    details: { dev_id: devId, dev_name: dev?.name },
  })

  revalidatePath(`/projects/${projectId}`)
}

// ============================================
// Delete Project
// ============================================

export async function deleteProjectAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // First, unlink the inquiry (if any) so it's not affected by deletion
  await supabase
    .from('inquiries')
    .update({
      converted_to_project_id: null,
      status: 'closed', // Keep as closed, just unlink
    })
    .eq('converted_to_project_id', projectId)

  // Delete activity_log entries first (to avoid FK constraint with trigger)
  await supabase
    .from('activity_log')
    .delete()
    .eq('project_id', projectId)

  // Delete the project (cascades to deliverables, requirements, files, etc.)
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) throw error

  revalidatePath('/projects')
}

// ============================================
// Onboarding Requirements (NEW)
// ============================================

export async function markRequirementCompleteAction(
  requirementId: string,
  projectId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('onboarding_requirements')
    .update({
      status: 'approved',
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq('id', requirementId)

  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'onboarding_requirement_completed',
    details: { requirement_id: requirementId },
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function addRequirementAction(
  projectId: string,
  data: {
    title: string
    description?: string
    owner_type?: 'hexona' | 'dfy' | 'client'
    blocker_type?: 'none' | 'partial' | 'absolute'
    parent_id?: string
  }
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get max position
  const { data: existing } = await supabase
    .from('onboarding_requirements')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = (existing?.[0]?.position ?? -1) + 1

  const { error } = await supabase
    .from('onboarding_requirements')
    .insert({
      project_id: projectId,
      parent_id: data.parent_id || null,
      title: data.title,
      description: data.description || null,
      owner_type: data.owner_type || 'hexona',
      blocker_type: data.blocker_type || 'none',
      position: nextPosition,
    })

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
}

export async function updateRequirementAction(
  requirementId: string,
  projectId: string,
  data: {
    title?: string
    description?: string
    owner_type?: 'hexona' | 'dfy' | 'client'
    blocker_type?: 'none' | 'partial' | 'absolute'
    notes?: string
    loom_url?: string
    resource_url?: string
  }
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('onboarding_requirements')
    .update(data)
    .eq('id', requirementId)

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
}

export async function deleteRequirementAction(
  requirementId: string,
  projectId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('onboarding_requirements')
    .delete()
    .eq('id', requirementId)

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
}

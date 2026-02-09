'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  canCompleteRequirement,
  updateRequirementDependencies,
} from '@/lib/api/project-requirements'
import { checkAndNotifyUnblockedRequirements } from '@/lib/api/requirement-notifications'
import { createNotification } from '@/lib/api/notifications'
import { captureBaseline } from '@/lib/api/scope-monitoring'
import { getProject, updateProject } from '@/lib/api/projects'
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

  // Get current status and project details for logging
  const { data: project } = await supabase
    .from('projects')
    .select('status, project_name, assigned_dev_id')
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

  // Notify assigned dev if status changed
  if (project.assigned_dev_id && project.assigned_dev_id !== user.id) {
    try {
      await createNotification({
        userId: project.assigned_dev_id,
        type: 'status_change',
        title: 'Project status updated',
        message: `${project.project_name} status changed to ${newStatus.replace(/_/g, ' ')}`,
        projectId,
        actorId: user.id,
      })
    } catch (e) {
      console.error('Failed to create notification:', e)
    }
  }

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

  // Capture scope baseline at sign-off
  try {
    await captureBaseline(projectId, user.id)
  } catch (e) {
    console.error('Failed to capture scope baseline:', e)
  }

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

  // Get project name for notification
  const { data: project } = await supabase
    .from('projects')
    .select('project_name')
    .eq('id', projectId)
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

  // Notify the assigned developer
  try {
    await createNotification({
      userId: devId,
      type: 'project_assigned',
      title: 'New project assigned',
      message: `You have been assigned to ${project?.project_name || 'a project'}`,
      projectId,
      actorId: user.id,
    })
  } catch (e) {
    console.error('Failed to create notification:', e)
  }

  revalidatePath(`/projects/${projectId}`)
}

// ============================================
// Archive Project
// ============================================

export async function archiveProjectAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('projects')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: user.id,
    })
    .eq('id', projectId)

  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'project_archived',
    details: {},
  })

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
}

export async function unarchiveProjectAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('projects')
    .update({
      archived_at: null,
      archived_by: null,
    })
    .eq('id', projectId)

  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'project_unarchived',
    details: {},
  })

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
}

// ============================================
// Delete Project (Soft Delete)
// ============================================

export async function deleteProjectAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Soft delete - mark as deleted but don't actually remove
  const { error } = await supabase
    .from('projects')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', projectId)

  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'project_deleted',
    details: {},
  })

  revalidatePath('/projects')
}

export async function restoreProjectAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('projects')
    .update({
      deleted_at: null,
      deleted_by: null,
      archived_at: null,
      archived_by: null,
    })
    .eq('id', projectId)

  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'project_restored',
    details: {},
  })

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
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

// ============================================
// Delivery Date Override
// ============================================

/**
 * Update the delivery date override for a project.
 * Pass null to clear the override and use calculated estimate.
 */
export async function updateDeliveryOverrideAction(
  projectId: string,
  overrideDate: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('projects')
    .update({ delivery_date_override: overrideDate })
    .eq('id', projectId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'delivery_date_override_updated',
    details: {
      override_date: overrideDate,
      cleared: overrideDate === null,
    },
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// ============================================
// Project Completion Ceremony
// ============================================

/**
 * Complete a project and generate completion summary
 */
export async function completeProjectAction(projectId: string): Promise<{ data?: { success: boolean }; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 1. Fetch project with deliverables
    const project = await getProject(projectId)

    // 2. Generate completion summary
    const summary = {
      total_deliverables: (project.deliverables || []).filter(d => d.status === 'completed' || d.status === 'done').length,
      total_deliverables_all: (project.deliverables || []).length,
      deliverable_titles: (project.deliverables || []).map(d => d.title),
      timeline_days: project.started_at
        ? Math.ceil((Date.now() - new Date(project.started_at).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      start_date: project.started_at || project.created_at,
      completion_date: new Date().toISOString(),
      team_members: [
        project.dfy_partner ? { id: project.dfy_partner.id, name: project.dfy_partner.name, role: 'dfy' } : null,
        project.assigned_dev ? { id: project.assigned_dev.id, name: project.assigned_dev.name, role: 'dev' } : null,
      ].filter(Boolean),
    }

    // 3. Update project status to completed with summary
    await updateProject(projectId, {
      status: 'completed',
      completion_summary: summary,
      completed_at: new Date().toISOString(),
    })

    // 4. Send notifications to all parties
    if (project.dfy_partner_id) {
      await createNotification({
        userId: project.dfy_partner_id,
        type: 'project_completed',
        title: 'Project completed',
        message: `${project.project_name} has been marked as completed`,
        projectId,
        actorId: user.id,
      })
    }
    if (project.assigned_dev_id) {
      await createNotification({
        userId: project.assigned_dev_id,
        type: 'project_completed',
        title: 'Project completed',
        message: `${project.project_name} has been marked as completed`,
        projectId,
        actorId: user.id,
      })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'project_completed',
      details: { summary },
    })

    revalidatePath(`/projects/${projectId}`)
    revalidatePath('/projects')
    return { data: { success: true } }
  } catch (error) {
    console.error('[completeProjectAction]', error)
    return { error: 'Failed to complete project' }
  }
}

/**
 * Move a project to retainer mode
 */
export async function moveToRetainerAction(params: {
  projectId: string
  checkInCadence: 'weekly' | 'biweekly' | 'monthly'
  checkInAssignees: string[]
  retainerDevIds: string[]
}): Promise<{ data?: { success: boolean }; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    await updateProject(params.projectId, {
      status: 'retainer',
      check_in_cadence: params.checkInCadence,
      check_in_assignees: params.checkInAssignees,
      retainer_dev_ids: params.retainerDevIds,
      retainer_started_at: new Date().toISOString(),
    })

    const project = await getProject(params.projectId)

    // Notify DFY partner
    if (project.dfy_partner_id) {
      await createNotification({
        userId: project.dfy_partner_id,
        type: 'project_moved_to_retainer',
        title: 'Project moved to retainer',
        message: `${project.project_name} is now in retainer mode`,
        projectId: params.projectId,
        actorId: user.id,
      })
    }

    // Notify retainer team members
    for (const devId of params.retainerDevIds) {
      await createNotification({
        userId: devId,
        type: 'project_moved_to_retainer',
        title: 'Assigned to retainer',
        message: `You've been assigned to the ${project.project_name} retainer`,
        projectId: params.projectId,
        actorId: user.id,
      })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: params.projectId,
      user_id: user.id,
      action: 'project_moved_to_retainer',
      details: {
        check_in_cadence: params.checkInCadence,
        check_in_assignees: params.checkInAssignees,
        retainer_dev_ids: params.retainerDevIds,
      },
    })

    revalidatePath(`/projects/${params.projectId}`)
    revalidatePath('/projects')
    return { data: { success: true } }
  } catch (error) {
    console.error('[moveToRetainerAction]', error)
    return { error: 'Failed to move to retainer' }
  }
}

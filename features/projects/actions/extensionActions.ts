'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createExtension,
  approveExtension,
  rejectExtension,
  type CreateExtensionInput,
} from '@/lib/api/project-extensions'
import { createNotification } from '@/lib/api/notifications'

// ============================================
// Extension Request Actions
// ============================================

/**
 * Request a project deadline extension
 */
export async function requestExtensionAction(
  input: CreateExtensionInput
): Promise<{ success: boolean; extensionId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const extension = await createExtension(input)

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: input.project_id,
      user_id: user.id,
      action: 'extension_requested',
      details: {
        extension_id: extension.id,
        original_deadline: input.original_deadline,
        requested_deadline: input.requested_deadline,
        client_delay_days: extension.client_delay_days,
        additional_days: extension.additional_days,
        reason: input.reason,
      },
    })

    // Create notification for DFY partner
    const { data: project } = await supabase
      .from('projects')
      .select('dfy_partner_id, project_name')
      .eq('id', input.project_id)
      .single()

    if (project?.dfy_partner_id) {
      await createNotification({
        userId: project.dfy_partner_id,
        type: 'status_change',
        title: 'Extension Request',
        message: `An extension has been requested for ${project.project_name}. Please review and approve or reject.`,
        projectId: input.project_id,
        actorId: user.id,
      })
    }

    revalidatePath(`/projects/${input.project_id}`)
    revalidatePath('/dashboard/dfy')
    return { success: true, extensionId: extension.id }
  } catch (error) {
    console.error('Failed to request extension:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to request extension',
    }
  }
}

/**
 * Approve an extension request (DFY action)
 */
export async function approveExtensionAction(
  extensionId: string,
  projectId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const extension = await approveExtension(extensionId, notes)

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'extension_approved',
      details: {
        extension_id: extensionId,
        new_deadline: extension.requested_deadline,
        review_notes: notes,
      },
    })

    // Notify the requester
    if (extension.requested_by) {
      const { data: project } = await supabase
        .from('projects')
        .select('project_name')
        .eq('id', projectId)
        .single()

      await createNotification({
        userId: extension.requested_by,
        type: 'status_change',
        title: 'Extension Approved',
        message: `Your extension request for ${project?.project_name} has been approved.`,
        projectId,
        actorId: user.id,
      })
    }

    revalidatePath(`/projects/${projectId}`)
    revalidatePath('/dashboard/dfy')
    return { success: true }
  } catch (error) {
    console.error('Failed to approve extension:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve extension',
    }
  }
}

/**
 * Reject an extension request (DFY action)
 */
export async function rejectExtensionAction(
  extensionId: string,
  projectId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const extension = await rejectExtension(extensionId, notes)

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'extension_rejected',
      details: {
        extension_id: extensionId,
        review_notes: notes,
      },
    })

    // Notify the requester
    if (extension.requested_by) {
      const { data: project } = await supabase
        .from('projects')
        .select('project_name')
        .eq('id', projectId)
        .single()

      await createNotification({
        userId: extension.requested_by,
        type: 'status_change',
        title: 'Extension Rejected',
        message: `Your extension request for ${project?.project_name} has been rejected.${notes ? ` Reason: ${notes}` : ''}`,
        projectId,
        actorId: user.id,
      })
    }

    revalidatePath(`/projects/${projectId}`)
    revalidatePath('/dashboard/dfy')
    return { success: true }
  } catch (error) {
    console.error('Failed to reject extension:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject extension',
    }
  }
}

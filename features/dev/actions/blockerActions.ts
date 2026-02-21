'use server'

import { revalidatePath } from 'next/cache'
import {
  createBlocker,
  updateBlockerStatus,
  updateBlocker,
  deleteBlocker,
  addBlockerComment,
  updateBlockerComment,
  deleteBlockerComment,
  getBlocker,
  escalateBlockerToDfy,
  type BlockerStatus,
  type BlockerPriority,
} from '@/lib/api/blockers'
import { createNotification } from '@/lib/api/notifications'
import { notifyAdmins } from '@/lib/api/notification-helpers'
import { createClient } from '@/lib/supabase/server'

export async function reportBlockerAction(params: {
  projectId: string
  deliverableId?: string
  title: string
  description?: string
  priority?: BlockerPriority
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const blocker = await createBlocker(params)
    revalidatePath(`/projects/${params.projectId}`)
    revalidatePath('/dashboard/dev')
    revalidatePath('/admin/blockers')

    // Notify admins of new blocker (fire-and-forget)
    try {
      const [{ data: profile }, { data: project }] = await Promise.all([
        user ? supabase.from('profiles').select('display_name').eq('id', user.id).single() : Promise.resolve({ data: null }),
        supabase.from('projects').select('name').eq('id', params.projectId).single(),
      ])
      const devName = profile?.display_name || 'A developer'
      const projectName = project?.name || 'Unknown project'
      await notifyAdmins({
        type: 'blocker_raised',
        title: 'New Blocker Reported',
        message: `${devName} raised a blocker on "${projectName}": ${params.title}`,
        projectId: params.projectId,
        actorId: user?.id,
      })
    } catch (e) {
      console.error('[reportBlockerAction] Notification failed:', e)
    }

    return { success: true, blocker }
  } catch (error) {
    console.error('Error reporting blocker:', error)
    return { success: false, message: 'Failed to report blocker' }
  }
}

export async function updateBlockerStatusAction(
  blockerId: string,
  status: BlockerStatus,
  notes?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get blocker before update for reporter info
    const blockerBefore = await getBlocker(blockerId)

    const blocker = await updateBlockerStatus(blockerId, status, notes)
    if (blocker.project_id) {
      revalidatePath(`/projects/${blocker.project_id}`)
    }
    revalidatePath('/dashboard/dev')
    revalidatePath('/dashboard/admin')
    revalidatePath('/admin/blockers')

    // Notify the reporter if status changed to acknowledged or resolved
    if (blockerBefore && user && blockerBefore.reported_by !== user.id) {
      const notificationType = status === 'acknowledged'
        ? 'blocker_acknowledged'
        : status === 'resolved'
          ? 'blocker_resolved'
          : null

      if (notificationType) {
        try {
          await createNotification({
            userId: blockerBefore.reported_by,
            type: notificationType,
            title: status === 'acknowledged'
              ? 'Blocker acknowledged'
              : 'Blocker resolved',
            message: `Your blocker "${blocker.title}" has been ${status}`,
            projectId: blocker.project_id,
            blockerId: blocker.id,
            actorId: user.id,
          })
        } catch (e) {
          console.error('Failed to create notification:', e)
        }
      }
    }

    return { success: true, blocker }
  } catch (error) {
    console.error('Error updating blocker status:', error)
    return { success: false, message: 'Failed to update blocker status' }
  }
}

export async function updateBlockerAction(
  blockerId: string,
  updates: { title?: string; description?: string; priority?: BlockerPriority }
) {
  try {
    const blocker = await updateBlocker(blockerId, updates)
    if (blocker.project_id) {
      revalidatePath(`/projects/${blocker.project_id}`)
    }
    return { success: true, blocker }
  } catch (error) {
    console.error('Error updating blocker:', error)
    return { success: false, message: 'Failed to update blocker' }
  }
}

export async function deleteBlockerAction(blockerId: string, projectId?: string) {
  try {
    await deleteBlocker(blockerId)
    if (projectId) {
      revalidatePath(`/projects/${projectId}`)
    }
    revalidatePath('/dashboard/dev')
    return { success: true }
  } catch (error) {
    console.error('Error deleting blocker:', error)
    return { success: false, message: 'Failed to delete blocker' }
  }
}

export async function addBlockerCommentAction(blockerId: string, content: string) {
  try {
    const comment = await addBlockerComment(blockerId, content)
    return { success: true, comment }
  } catch (error) {
    console.error('Error adding blocker comment:', error)
    return { success: false, message: 'Failed to add comment' }
  }
}

export async function updateBlockerCommentAction(commentId: string, content: string) {
  try {
    const comment = await updateBlockerComment(commentId, content)
    return { success: true, comment }
  } catch (error) {
    console.error('Error updating blocker comment:', error)
    return { success: false, message: 'Failed to update comment' }
  }
}

export async function deleteBlockerCommentAction(commentId: string) {
  try {
    await deleteBlockerComment(commentId)
    return { success: true }
  } catch (error) {
    console.error('Error deleting blocker comment:', error)
    return { success: false, message: 'Failed to delete comment' }
  }
}

export async function escalateBlockerAction(blockerId: string) {
  try {
    const blocker = await escalateBlockerToDfy(blockerId)

    // Get the DFY partner for this project
    const supabase = await createClient()
    const { data: project } = await supabase
      .from('projects')
      .select('dfy_partner_id')
      .eq('id', blocker.project_id)
      .single()

    if (project?.dfy_partner_id) {
      try {
        await createNotification({
          userId: project.dfy_partner_id,
          type: 'blocker_comment',
          title: 'Blocker escalated to you',
          message: `A blocker "${blocker.title}" on project ${blocker.project?.project_name || ''} needs your attention.`,
          projectId: blocker.project_id,
          blockerId: blocker.id,
        })
      } catch (e) {
        console.error('Failed to notify DFY partner:', e)
      }
    }

    revalidatePath('/admin/blockers')
    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/dfy')
    return { success: true, blocker }
  } catch (error) {
    console.error('Error escalating blocker:', error)
    return { success: false, message: 'Failed to escalate blocker' }
  }
}

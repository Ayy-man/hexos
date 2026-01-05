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
  type BlockerStatus,
  type BlockerPriority,
} from '@/lib/api/blockers'

export async function reportBlockerAction(params: {
  projectId: string
  deliverableId?: string
  title: string
  description?: string
  priority?: BlockerPriority
}) {
  try {
    const blocker = await createBlocker(params)
    revalidatePath(`/projects/${params.projectId}`)
    revalidatePath('/dashboard/dev')
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
    const blocker = await updateBlockerStatus(blockerId, status, notes)
    if (blocker.project_id) {
      revalidatePath(`/projects/${blocker.project_id}`)
    }
    revalidatePath('/dashboard/dev')
    revalidatePath('/dashboard/admin')
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

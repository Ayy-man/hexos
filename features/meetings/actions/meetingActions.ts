'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createMeeting,
  deleteMeeting,
  addMeetingLink,
  removeMeetingLink,
} from '@/lib/api/meetings'
import type { CreateMeetingInput, MeetingLinkableType } from '@/lib/types/meetings'
import { notifyAdmins, notifyProjectStakeholders } from '@/lib/api/notification-helpers'

/**
 * Create a new meeting and dispatch Recall.ai bot
 */
export async function createMeetingAction(
  input: CreateMeetingInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const result = await createMeeting(input, user.id)

  if (result.success && result.data) {
    revalidatePath('/meetings')

    // Notify relevant users that a meeting has been scheduled (fire-and-forget)
    try {
      const meeting = result.data
      const meetingTitle = meeting.title
      const scheduledAt = meeting.scheduled_at
        ? new Date(meeting.scheduled_at).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : 'TBD'
      const message = `New meeting scheduled: "${meetingTitle}" on ${scheduledAt}`

      // If the meeting is linked to a project, notify all project stakeholders
      const projectLink = input.links?.find((l) => l.type === 'project')
      if (projectLink) {
        await notifyProjectStakeholders({
          projectId: projectLink.id,
          type: 'meeting_scheduled',
          title: 'Meeting Scheduled',
          message,
          actorId: user.id,
          excludeUserId: user.id,
        })
      } else {
        // No project context — notify admins
        await notifyAdmins({
          type: 'meeting_scheduled',
          title: 'Meeting Scheduled',
          message,
          actorId: user.id,
        })
      }
    } catch (e) {
      console.error('[createMeetingAction] Notification failed:', e)
    }
  }

  return result
}

/**
 * Delete a meeting
 */
export async function deleteMeetingAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const result = await deleteMeeting(id)

  if (result.success) {
    revalidatePath('/meetings')
  }

  return result
}

/**
 * Add a meeting link to a project or inquiry
 */
export async function addMeetingLinkAction(
  meetingId: string,
  linkableType: MeetingLinkableType,
  linkableId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const result = await addMeetingLink(meetingId, linkableType, linkableId)

  if (result.success) {
    revalidatePath('/meetings')
    revalidatePath(`/meetings/${meetingId}`)
  }

  return result
}

/**
 * Remove a meeting link
 */
export async function removeMeetingLinkAction(
  linkId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const result = await removeMeetingLink(linkId)

  if (result.success) {
    revalidatePath('/meetings')
  }

  return result
}

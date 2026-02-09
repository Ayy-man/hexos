'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createMeeting, deleteMeeting } from '@/lib/api/meetings'
import type { CreateMeetingInput } from '@/lib/types/meetings'

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

  if (result.success) {
    revalidatePath('/meetings')
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

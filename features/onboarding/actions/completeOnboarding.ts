'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeOnboarding(data: {
  name?: string
  timezone?: string
  city?: string
  country?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const updates: Record<string, unknown> = {
    has_completed_onboarding: true,
  }

  if (data.name) updates.name = data.name
  if (data.timezone) updates.timezone = data.timezone
  if (data.city) updates.city = data.city
  if (data.country) updates.country = data.country

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

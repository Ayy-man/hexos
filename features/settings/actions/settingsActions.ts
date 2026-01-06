'use server'

import { revalidatePath } from 'next/cache'
import { updateCurrentUserLocation } from '@/lib/api/profiles'

export async function updateLocationAction(location: {
  city?: string | null
  country?: string | null
  timezone?: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    await updateCurrentUserLocation(location)
    revalidatePath('/settings')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Update location error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update location'
    }
  }
}

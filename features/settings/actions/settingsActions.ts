'use server'

import { revalidatePath } from 'next/cache'
import {
  updateCurrentUserLocation,
  updateCurrentUserProfile,
  uploadAvatar,
  removeAvatar,
  updateNotificationPreferences,
  updateUiPreferences,
  updateDevAvailability,
  type ProfileUpdate,
  type NotificationPreferences,
  type UiPreferences,
} from '@/lib/api/profiles'

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

export async function updateProfileAction(
  updates: ProfileUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateCurrentUserProfile(updates)
    revalidatePath('/settings')
    revalidatePath('/settings/profile')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Update profile error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile'
    }
  }
}

export async function uploadAvatarAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('avatar') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    const url = await uploadAvatar(file)
    revalidatePath('/settings')
    revalidatePath('/settings/profile')
    revalidatePath('/dashboard')
    return { success: true, url }
  } catch (error) {
    console.error('Upload avatar error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload avatar'
    }
  }
}

export async function removeAvatarAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await removeAvatar()
    revalidatePath('/settings')
    revalidatePath('/settings/profile')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Remove avatar error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove avatar'
    }
  }
}

export async function updateNotificationPreferencesAction(
  prefs: NotificationPreferences
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateNotificationPreferences(prefs)
    revalidatePath('/settings')
    revalidatePath('/settings/notifications')
    return { success: true }
  } catch (error) {
    console.error('Update notification preferences error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update notification preferences'
    }
  }
}

export async function updateUiPreferencesAction(
  prefs: UiPreferences
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateUiPreferences(prefs)
    revalidatePath('/settings')
    revalidatePath('/settings/appearance')
    return { success: true }
  } catch (error) {
    console.error('Update UI preferences error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update preferences'
    }
  }
}

export async function updateDevAvailabilityAction(updates: {
  is_available?: boolean
  available_hours_per_week?: number
  max_concurrent_projects?: number
  available_from?: string | null
  available_until?: string | null
  status_message?: string | null
  auto_assign?: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDevAvailability(updates)
    revalidatePath('/settings')
    revalidatePath('/settings/developer')
    return { success: true }
  } catch (error) {
    console.error('Update dev availability error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update availability'
    }
  }
}

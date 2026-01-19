import { createClient } from '@/lib/supabase/server'
import type { UserRole, Profile } from '@/lib/auth/types'

export interface ProfileWithRole extends Profile {
  role: UserRole
}

// Get all profiles (admin only via RLS)
export async function getProfiles() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ProfileWithRole[]
}

// Get profiles by role
export async function getProfilesByRole(role: UserRole) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role)
    .order('name', { ascending: true })

  if (error) throw error
  return data as ProfileWithRole[]
}

// Get devs for assignment dropdown
export async function getDevs() {
  return getProfilesByRole('dev')
}

// Get DFY partners for assignment dropdown
export async function getDfyPartners() {
  return getProfilesByRole('dfy')
}

// Update profile (admin can update any, users can update own)
export async function updateProfile(id: string, input: { name?: string; role?: UserRole; logo_url?: string | null }) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ProfileWithRole
}

// Get current user's profile
export async function getCurrentProfile(): Promise<ProfileWithRole | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return null
  return data as ProfileWithRole
}

// Upload DFY logo to storage
export async function uploadDfyLogo(file: File): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const fileExt = file.name.split('.').pop()?.toLowerCase()
  if (!fileExt || !['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(fileExt)) {
    throw new Error('Invalid file type. Use PNG, JPG, SVG, or WebP')
  }

  const fileName = `dfy-logos/${user.id}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('general-purpose')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) {
    console.error('Logo upload error:', error)
    throw new Error('Failed to upload logo')
  }

  const { data: urlData } = supabase.storage
    .from('general-purpose')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

// Update current user's logo
export async function updateCurrentUserLogo(logoUrl: string | null): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update({ logo_url: logoUrl })
    .eq('id', user.id)

  if (error) throw error
}

// Update current user's location
export async function updateCurrentUserLocation(location: {
  city?: string | null
  country?: string | null
  timezone?: string | null
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update(location)
    .eq('id', user.id)

  if (error) throw error
}

// Remove DFY logo from storage
export async function removeDfyLogo(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get current profile to find logo path
  const { data: profile } = await supabase
    .from('profiles')
    .select('logo_url')
    .eq('id', user.id)
    .single()

  if (profile?.logo_url) {
    // Extract path from URL
    const url = new URL(profile.logo_url)
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/general-purpose\/(.+)/)
    if (pathMatch) {
      await supabase.storage.from('general-purpose').remove([pathMatch[1]])
    }
  }

  // Clear logo_url in profile
  await updateCurrentUserLogo(null)
}

// ============================================================================
// PROFILE SYSTEM ENHANCEMENTS
// ============================================================================

export interface ProfileUpdate {
  name?: string
  bio?: string | null
  phone?: string | null
  company_name?: string | null
  avatar_url?: string | null
  availability_status?: 'available' | 'busy' | 'unavailable' | 'away'
  availability_message?: string | null
}

export interface NotificationPreferences {
  in_app: {
    project_updates: boolean
    deliverable_completed: boolean
    mentions: boolean
    direct_messages: boolean
    inquiry_updates: boolean
    payment_updates: boolean
  }
  email: {
    project_updates: boolean
    deliverable_completed: boolean
    mentions: boolean
    inquiry_updates: boolean
    payment_updates: boolean
    weekly_digest: boolean
  }
}

export interface UiPreferences {
  compact_mode: boolean
  default_project_view: 'list' | 'board'
  default_inquiry_view: 'list' | 'board'
}

// Update current user's profile
export async function updateCurrentUserProfile(updates: ProfileUpdate): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) throw error
}

// Upload avatar to storage
export async function uploadAvatar(file: File): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const fileExt = file.name.split('.').pop()?.toLowerCase()
  if (!fileExt || !['png', 'jpg', 'jpeg', 'webp'].includes(fileExt)) {
    throw new Error('Invalid file type. Use PNG, JPG, or WebP')
  }

  // Add timestamp to prevent caching issues
  const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('general-purpose')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) {
    console.error('Avatar upload error:', error)
    throw new Error('Failed to upload avatar')
  }

  const { data: urlData } = supabase.storage
    .from('general-purpose')
    .getPublicUrl(data.path)

  // Update profile with new avatar URL
  await updateCurrentUserProfile({ avatar_url: urlData.publicUrl })

  return urlData.publicUrl
}

// Remove avatar
export async function removeAvatar(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get current avatar URL
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .single()

  if (profile?.avatar_url) {
    // Extract path from URL and delete
    const url = new URL(profile.avatar_url)
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/general-purpose\/(.+)/)
    if (pathMatch) {
      await supabase.storage.from('general-purpose').remove([pathMatch[1]])
    }
  }

  // Clear avatar_url in profile
  await updateCurrentUserProfile({ avatar_url: null })
}

// Update notification preferences
export async function updateNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update({ notification_preferences: prefs })
    .eq('id', user.id)

  if (error) throw error
}

// Update UI preferences
export async function updateUiPreferences(prefs: UiPreferences): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update({ ui_preferences: prefs })
    .eq('id', user.id)

  if (error) throw error
}

// Get or create dev availability
export async function getDevAvailability() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('dev_availability')
    .select('*')
    .eq('dev_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Update dev availability
export async function updateDevAvailability(updates: {
  is_available?: boolean
  available_hours_per_week?: number
  max_concurrent_projects?: number
  available_from?: string | null
  available_until?: string | null
  status_message?: string | null
  auto_assign?: boolean
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('dev_availability')
    .upsert({
      dev_id: user.id,
      ...updates,
      updated_at: new Date().toISOString()
    })

  if (error) throw error
}

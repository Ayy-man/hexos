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

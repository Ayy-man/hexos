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
export async function updateProfile(id: string, input: { name?: string; role?: UserRole }) {
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

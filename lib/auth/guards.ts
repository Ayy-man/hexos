import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserRole, Profile } from './types'
import { DASHBOARD_ROUTES } from './types'

export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function requireAuth() {
  const user = await getSession()

  if (!user) {
    redirect('/login')
  }

  return user
}

export async function requireProfile() {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  return profile
}

export async function requireRole(allowedRoles: UserRole[]) {
  const profile = await requireProfile()

  if (!allowedRoles.includes(profile.role)) {
    redirect('/unauthorized')
  }

  return profile
}

export async function requireAdmin() {
  return requireRole(['admin'])
}

export async function requireInternal() {
  return requireRole(['admin', 'internal'])
}

export async function redirectToDashboard() {
  const profile = await getProfile()

  if (profile) {
    redirect(DASHBOARD_ROUTES[profile.role])
  }
}

import { redirect } from 'next/navigation'
import type { UserRole, Profile } from './types'
import { DASHBOARD_ROUTES } from './types'
import { getAuthUser, getAuthProfile } from './cached'

export async function getSession() {
  const { user } = await getAuthUser()
  return user
}

export async function getProfile(): Promise<Profile | null> {
  return getAuthProfile()
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

export async function checkAuth() {
  const profile = await getProfile()

  if (!profile) {
    throw new Error('Not authenticated')
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

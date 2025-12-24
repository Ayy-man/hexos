export type UserRole = 'admin' | 'internal' | 'dev' | 'dfy' | 'client'

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  logo_url?: string | null
  created_at: string
}

export interface AuthUser {
  id: string
  email: string
  profile: Profile
}

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100,
  internal: 80,
  dev: 50,
  dfy: 50,
  client: 10,
}

// Dashboard routes per role
export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  internal: '/dashboard/admin',
  dev: '/dashboard/dev',
  dfy: '/dashboard/dfy',
  client: '/dashboard/client',
}

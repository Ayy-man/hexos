'use client'

import { usePresence } from '@/hooks/use-presence'
import type { Profile } from '@/lib/auth/types'

interface PresenceProviderProps {
  profile: Profile
  children: React.ReactNode
}

/**
 * Provider component that wraps the app to broadcast user presence.
 * Should be placed in the dashboard layout to track all authenticated users.
 */
export function PresenceProvider({ profile, children }: PresenceProviderProps) {
  usePresence(profile)
  return <>{children}</>
}

'use client'

import { LocationTag } from '@/components/ui/location-tag'
import type { Profile } from '@/lib/auth/types'

interface ProfileLocationTagProps {
  profile: Pick<Profile, 'city' | 'country' | 'timezone'>
  /** Fallback text when no location is set */
  fallback?: React.ReactNode
}

/**
 * Displays a LocationTag for a user profile.
 * Shows the user's city, country, and local time based on their profile settings.
 *
 * Usage:
 * ```tsx
 * <ProfileLocationTag profile={user} />
 * ```
 */
export function ProfileLocationTag({ profile, fallback }: ProfileLocationTagProps) {
  if (!profile.city || !profile.country) {
    if (fallback) {
      return <>{fallback}</>
    }
    return null
  }

  return (
    <LocationTag
      city={profile.city}
      country={profile.country}
      timezone={profile.timezone || 'UTC'}
    />
  )
}

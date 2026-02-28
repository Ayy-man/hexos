import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from './types'

/**
 * Cached auth user fetch — deduplicated per request via React.cache().
 * Multiple calls within the same server render only hit Supabase once.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
})

/**
 * Cached profile fetch — deduplicated per request via React.cache().
 * Builds on getAuthUser() so auth is also deduplicated.
 */
export const getAuthProfile = cache(async (): Promise<Profile | null> => {
  const { user } = await getAuthUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
})

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/auth/types'

const HEARTBEAT_INTERVAL = 60_000 // 60 seconds
const CHANNEL_NAME = 'app:presence'

interface PresencePayload {
  id: string
  name: string
  email: string
  role: string
  online_at: string
}

/**
 * Hook to broadcast user presence across the app.
 * All authenticated users join a global presence channel.
 * Updates last_seen_at in the database every 60 seconds.
 */
export function useAppPresence(profile: Profile | null) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

  const updateLastSeen = useCallback(async () => {
    if (!profile) return
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', profile.id)
  }, [profile])

  useEffect(() => {
    if (!profile) return

    const supabase = createClient()

    const presencePayload: PresencePayload = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      online_at: new Date().toISOString(),
    }

    // Join presence channel
    const channel = supabase.channel(CHANNEL_NAME)
      .on('presence', { event: 'sync' }, () => {
        // Presence state synced - handled by useOnlineUsers
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(presencePayload)
        }
      })

    channelRef.current = channel

    // Heartbeat: update last_seen_at every 60s
    heartbeatRef.current = setInterval(updateLastSeen, HEARTBEAT_INTERVAL)
    updateLastSeen() // Initial update

    // Update on page unload
    const handleBeforeUnload = () => {
      updateLastSeen()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [profile, updateLastSeen])
}

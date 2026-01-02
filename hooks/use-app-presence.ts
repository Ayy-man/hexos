'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/auth/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

const HEARTBEAT_INTERVAL = 60000 // 60 seconds
const PRESENCE_CHANNEL = 'app:presence'

export interface PresencePayload {
  id: string
  name: string
  email: string
  role: string
  online_at: string
}

/**
 * Hook to broadcast user presence to the global presence channel.
 * Tracks when users are online and updates last_seen_at periodically.
 */
export function useAppPresence(profile: Profile) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const presencePayload: PresencePayload = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      online_at: new Date().toISOString(),
    }

    // Subscribe to presence channel
    const channel = supabase.channel(PRESENCE_CHANNEL)

    channel
      .on('presence', { event: 'sync' }, () => {
        // Presence state synced
      })
      .on('presence', { event: 'join' }, () => {
        // User joined
      })
      .on('presence', { event: 'leave' }, () => {
        // User left
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track(presencePayload)
          } catch (err) {
            console.error('Failed to track presence:', err)
          }
        }
      })

    channelRef.current = channel

    // Update last_seen_at in database periodically (fire-and-forget, non-blocking)
    const updateLastSeen = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', profile.id)
      } catch (err) {
        console.error('Failed to update last_seen:', err)
      }
    }

    // Initial update (non-blocking)
    updateLastSeen()

    // Set up heartbeat
    heartbeatRef.current = setInterval(updateLastSeen, HEARTBEAT_INTERVAL)

    // Cleanup on unmount
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [profile.id, profile.name, profile.email, profile.role])
}

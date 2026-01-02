'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

const PRESENCE_CHANNEL = 'app:presence'

export interface OnlineUser {
  id: string
  name: string
  email: string
  role: string
  online_at: string
}

/**
 * Hook to listen for online users from the presence channel.
 * Returns a deduplicated list of currently online users.
 */
export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [channelRef, setChannelRef] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel(PRESENCE_CHANNEL)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users: OnlineUser[] = []
        const seenIds = new Set<string>()

        // Extract users from presence state, deduplicating by id
        Object.values(state).forEach((presences) => {
          presences.forEach((presence: unknown) => {
            const p = presence as OnlineUser
            if (p.id && !seenIds.has(p.id)) {
              seenIds.add(p.id)
              users.push({
                id: p.id,
                name: p.name,
                email: p.email,
                role: p.role,
                online_at: p.online_at,
              })
            }
          })
        })

        setOnlineUsers(users)
      })
      .subscribe()

    setChannelRef(channel)

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  return { onlineUsers, channel: channelRef }
}

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePresenceState } from '@supabase/supabase-js'

const CHANNEL_NAME = 'app:presence'

export interface OnlineUser {
  id: string
  name: string
  email: string
  role: string
  online_at: string
}

/**
 * Hook to listen for online users via Supabase Presence.
 * Used by admin/internal roles to see who's currently online.
 */
export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const extractUsers = useCallback((state: RealtimePresenceState) => {
    const users: OnlineUser[] = []
    Object.values(state).forEach((presences) => {
      presences.forEach((presence: unknown) => {
        const p = presence as Record<string, unknown>
        if (p.id) {
          users.push({
            id: p.id as string,
            name: p.name as string,
            email: p.email as string,
            role: p.role as string,
            online_at: p.online_at as string,
          })
        }
      })
    })
    // Dedupe by id (user might have multiple tabs open)
    const uniqueUsers = Array.from(
      new Map(users.map(u => [u.id, u])).values()
    )
    return uniqueUsers
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel(CHANNEL_NAME)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineUsers(extractUsers(state))
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [extractUsers])

  return { onlineUsers }
}

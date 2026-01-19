'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/auth/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

const HEARTBEAT_INTERVAL = 60000 // 60 seconds
const PRESENCE_CHANNEL = 'app:presence'

// Module-level singleton for shared channel
let sharedChannel: RealtimeChannel | null = null
let subscriberCount = 0

export interface OnlineUser {
  id: string
  name: string
  email: string
  role: string
  online_at: string
}

/**
 * Combined presence hook that handles both:
 * 1. Broadcasting current user's presence
 * 2. Tracking all online users
 *
 * Uses a single shared channel to avoid duplicate connections.
 */
export function usePresence(profile: Profile) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const supabaseRef = useRef(createClient())

  const syncUsers = useCallback((channel: RealtimeChannel) => {
    const state = channel.presenceState()
    const users: OnlineUser[] = []
    const seenIds = new Set<string>()

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
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    subscriberCount++

    const presencePayload: OnlineUser = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      online_at: new Date().toISOString(),
    }

    // Create or reuse shared channel
    if (!sharedChannel) {
      sharedChannel = supabase.channel(PRESENCE_CHANNEL)

      sharedChannel
        .on('presence', { event: 'sync' }, () => {
          if (sharedChannel) {
            syncUsers(sharedChannel)
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              await sharedChannel?.track(presencePayload)
            } catch (err) {
              console.error('Failed to track presence:', err)
            }
          }
        })
    } else {
      // Channel exists, track presence and sync users
      sharedChannel.track(presencePayload).catch((err) => {
        console.error('Failed to track presence:', err)
      })
      syncUsers(sharedChannel)
    }

    // Update last_seen_at periodically
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

    updateLastSeen()
    heartbeatRef.current = setInterval(updateLastSeen, HEARTBEAT_INTERVAL)

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      subscriberCount--
      if (subscriberCount === 0 && sharedChannel) {
        supabase.removeChannel(sharedChannel)
        sharedChannel = null
      }
    }
  }, [profile.id, profile.name, profile.email, profile.role, syncUsers])

  return { onlineUsers }
}

/**
 * Simplified hook for components that only need to read online users
 * without broadcasting their own presence.
 */
export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const supabaseRef = useRef(createClient())

  const syncUsers = useCallback((channel: RealtimeChannel) => {
    const state = channel.presenceState()
    const users: OnlineUser[] = []
    const seenIds = new Set<string>()

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
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    subscriberCount++

    // Create or reuse shared channel
    if (!sharedChannel) {
      sharedChannel = supabase.channel(PRESENCE_CHANNEL)
      sharedChannel
        .on('presence', { event: 'sync' }, () => {
          if (sharedChannel) {
            syncUsers(sharedChannel)
          }
        })
        .subscribe()
    } else {
      // Channel exists, sync users
      syncUsers(sharedChannel)
    }

    return () => {
      subscriberCount--
      if (subscriberCount === 0 && sharedChannel) {
        supabase.removeChannel(sharedChannel)
        sharedChannel = null
      }
    }
  }, [syncUsers])

  return { onlineUsers }
}

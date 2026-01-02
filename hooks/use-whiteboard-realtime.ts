'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Profile } from '@/lib/auth/types'

// Throttle helper for cursor broadcast
function throttleCursor(
  fn: (x: number, y: number) => void,
  delay: number
): (x: number, y: number) => void {
  let lastCall = 0
  return (x: number, y: number) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(x, y)
    }
  }
}

export interface WhiteboardViewer {
  userId: string
  userName: string
  userEmail: string
  color: string
  joinedAt: string
  cursor?: { x: number; y: number }
}

export interface RemoteSaveInfo {
  savedBy: string
  savedByName: string
  savedAt: Date
}

interface UseWhiteboardRealtimeOptions {
  projectId: string
  profile: Profile
  hasUnsavedChanges: boolean
  onRemoteSave?: (info: RemoteSaveInfo) => void
}

interface UseWhiteboardRealtimeReturn {
  viewers: WhiteboardViewer[]
  isConflicted: boolean
  remoteSave: RemoteSaveInfo | null
  clearConflict: () => void
  broadcastCursor: (x: number, y: number) => void
}

// Generate a consistent color from user ID
function getUserColor(userId: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function useWhiteboardRealtime({
  projectId,
  profile,
  hasUnsavedChanges,
  onRemoteSave,
}: UseWhiteboardRealtimeOptions): UseWhiteboardRealtimeReturn {
  const [viewers, setViewers] = useState<WhiteboardViewer[]>([])
  const [isConflicted, setIsConflicted] = useState(false)
  const [remoteSave, setRemoteSave] = useState<RemoteSaveInfo | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges)

  // Keep ref in sync
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges
  }, [hasUnsavedChanges])

  const clearConflict = useCallback(() => {
    setIsConflicted(false)
    setRemoteSave(null)
  }, [])

  // Throttled cursor broadcast
  const broadcastCursor = useCallback(
    throttleCursor((x: number, y: number) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'cursor',
          payload: { userId: profile.id, x, y },
        })
      }
    }, 50), // 50ms throttle = 20 updates/sec max
    [profile.id]
  )

  useEffect(() => {
    const supabase = createClient()
    const channelName = `whiteboard:${projectId}`

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: profile.id,
        },
      },
    })

    // Presence: track viewers
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{
          odId: string
          userName: string
          userEmail: string
          color: string
          joinedAt: string
        }>()

        const currentViewers: WhiteboardViewer[] = []
        Object.entries(state).forEach(([key, presences]) => {
          // Skip self
          if (key === profile.id) return

          const presence = presences[0]
          if (presence) {
            currentViewers.push({
              userId: key,
              userName: presence.userName,
              userEmail: presence.userEmail,
              color: presence.color,
              joinedAt: presence.joinedAt,
            })
          }
        })

        setViewers(currentViewers)
      })

    // Broadcast: live cursors
    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      if (payload.userId === profile.id) return

      setViewers((prev) =>
        prev.map((v) =>
          v.userId === payload.userId
            ? { ...v, cursor: { x: payload.x, y: payload.y } }
            : v
        )
      )
    })

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          odId: profile.id,
          userName: profile.name,
          userEmail: profile.email,
          color: getUserColor(profile.id),
          joinedAt: new Date().toISOString(),
        })
      }
    })

    channelRef.current = channel

    // Separate subscription for DB changes
    const dbChannel = supabase
      .channel(`whiteboard-db:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          // Check if main_whiteboard was updated
          const newData = payload.new as { updated_at?: string; id: string }
          const oldData = payload.old as { updated_at?: string }

          // Only trigger if we didn't make this change (check timing)
          // If we have unsaved changes and someone else saved, that's a conflict
          if (hasUnsavedChangesRef.current) {
            const saveInfo: RemoteSaveInfo = {
              savedBy: 'Another user', // Would need to track who in DB
              savedByName: 'Someone else',
              savedAt: new Date(),
            }
            setRemoteSave(saveInfo)
            setIsConflicted(true)
            onRemoteSave?.(saveInfo)
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(dbChannel)
    }
  }, [projectId, profile.id, profile.name, profile.email, onRemoteSave])

  return {
    viewers,
    isConflicted,
    remoteSave,
    clearConflict,
    broadcastCursor,
  }
}

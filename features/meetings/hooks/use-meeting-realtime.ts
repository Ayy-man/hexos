'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Meeting } from '@/lib/types/meetings'

interface UseMeetingRealtimeOptions {
  meetingId: string
  initialMeeting: Meeting
}

/**
 * Hook to subscribe to real-time meeting status updates via Supabase Realtime
 * Simpler single-meeting approach for meeting detail page
 */
export function useMeetingRealtime({
  meetingId,
  initialMeeting,
}: UseMeetingRealtimeOptions) {
  const [meeting, setMeeting] = useState<Meeting>(initialMeeting)
  const [isConnected, setIsConnected] = useState(false)

  // Sync with initial meeting when it changes
  useEffect(() => {
    setMeeting(initialMeeting)
  }, [initialMeeting])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!meetingId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meetings',
          filter: `id=eq.${meetingId}`,
        },
        (payload) => {
          // Meeting updated - update local state
          const updated = payload.new as Meeting
          setMeeting((prev) => ({
            ...prev,
            ...updated,
          }))
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [meetingId])

  const refresh = useCallback(() => {
    // Trigger a fetch of the latest meeting data
    // This would typically be done by calling router.refresh() in the component
    setMeeting(initialMeeting)
  }, [initialMeeting])

  return {
    meeting,
    isConnected,
    refresh,
  }
}

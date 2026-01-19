'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/api/notifications-utils'

interface UseNotificationsRealtimeOptions {
  userId: string
  initialNotifications: Notification[]
  initialUnreadCount: number
  onNewNotification?: (notification: Notification) => void
}

/**
 * Hook to subscribe to real-time notifications via Supabase Realtime
 */
export function useNotificationsRealtime({
  userId,
  initialNotifications,
  initialUnreadCount,
  onNewNotification,
}: UseNotificationsRealtimeOptions) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [isLoading, setIsLoading] = useState(false)
  const [toastQueue, setToastQueue] = useState<Notification[]>([])
  const [hasShownInitial, setHasShownInitial] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio on mount
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.wav')
    audioRef.current.volume = 0.5
  }, [])

  // Play notification sound
  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      })
    }
  }, [])

  // Dismiss a toast notification
  const dismissToast = useCallback((id: string) => {
    setToastQueue(prev => prev.filter(n => n.id !== id))
  }, [])

  // Mark notifications as having been shown as toast popups (client-side)
  const markNotificationsAsToastShown = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ shown_as_toast_at: new Date().toISOString() })
      .in('id', ids)
  }, [])

  // Refetch all notifications
  const refetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!actor_id(id, name),
          project:projects(id, project_name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const normalized = (data || []).map(normalizeNotification)
      setNotifications(normalized)
      setUnreadCount(normalized.filter(n => !n.read_at).length)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      // Revert on error
      refetch()
    }
  }, [refetch])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    )
    setUnreadCount(0)

    try {
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      refetch()
    }
  }, [userId, refetch])

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          // New notification received!
          const newNotification = payload.new as Notification

          // Play sound
          playSound()

          // Fetch full notification with relations
          const { data } = await supabase
            .from('notifications')
            .select(`
              *,
              actor:profiles!actor_id(id, name),
              project:projects(id, project_name)
            `)
            .eq('id', newNotification.id)
            .single()

          if (data) {
            const normalized = normalizeNotification(data)
            setNotifications(prev => [normalized, ...prev])
            setUnreadCount(prev => prev + 1)
            // Add to toast queue (max 5)
            setToastQueue(prev => [...prev, normalized].slice(-5))
            // Mark as toast-shown immediately (fire and forget)
            void supabase
              .from('notifications')
              .update({ shown_as_toast_at: new Date().toISOString() })
              .eq('id', normalized.id)
            onNewNotification?.(normalized)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Notification updated (e.g., marked as read)
          const updated = payload.new as Notification
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? { ...n, ...updated } : n)
          )
          // Recalculate unread count
          setNotifications(prev => {
            setUnreadCount(prev.filter(n => !n.read_at).length)
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, playSound, onNewNotification])

  // Sync with initial props
  useEffect(() => {
    setNotifications(initialNotifications)
    setUnreadCount(initialUnreadCount)
  }, [initialNotifications, initialUnreadCount])

  // Show initial unread notifications as toasts on first load
  // ONLY if they haven't been shown as toast before AND are recent (< 5 min)
  useEffect(() => {
    if (!hasShownInitial && initialNotifications.length > 0) {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      const unshown = initialNotifications.filter(n =>
        !n.read_at &&
        !n.shown_as_toast_at &&
        new Date(n.created_at).getTime() > fiveMinutesAgo
      ).slice(0, 5)

      if (unshown.length > 0) {
        setToastQueue(unshown)
        playSound()
        // Mark as toast-shown (fire and forget)
        markNotificationsAsToastShown(unshown.map(n => n.id)).catch(console.error)
      }
      setHasShownInitial(true)
    }
  }, [initialNotifications, hasShownInitial, playSound, markNotificationsAsToastShown])

  return {
    notifications,
    unreadCount,
    isLoading,
    toastQueue,
    refetch,
    markAsRead,
    markAllAsRead,
    dismissToast,
  }
}

// Helper to normalize Supabase relations
function normalizeNotification(notification: Record<string, unknown>): Notification {
  const actor = Array.isArray(notification.actor)
    ? notification.actor[0]
    : notification.actor
  const project = Array.isArray(notification.project)
    ? notification.project[0]
    : notification.project

  return {
    ...notification,
    actor,
    project,
  } as Notification
}

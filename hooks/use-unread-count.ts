'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UnreadCounts {
  total: number
  byConversation: Record<string, number>
}

/**
 * Hook to track unread message counts across all accessible conversations
 * Subscribes to new messages and updates counts in real-time
 */
export function useUnreadCount(userId: string | undefined) {
  const [counts, setCounts] = useState<UnreadCounts>({ total: 0, byConversation: {} })
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) {
      setCounts({ total: 0, byConversation: {} })
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Get all conversations user has access to (RLS handles this)
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')

      if (convError) throw convError
      if (!conversations || conversations.length === 0) {
        setCounts({ total: 0, byConversation: {} })
        setIsLoading(false)
        return
      }

      const conversationIds = conversations.map((c) => c.id)

      // Get read statuses for all conversations
      const { data: readStatuses, error: readError } = await supabase
        .from('conversation_read_status')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId)
        .in('conversation_id', conversationIds)

      if (readError) throw readError

      // Create a map of last read times
      const readMap = new Map<string, string>(
        (readStatuses || []).map((r) => [r.conversation_id, r.last_read_at])
      )

      // Count unread messages for each conversation
      const byConversation: Record<string, number> = {}
      let total = 0

      for (const convId of conversationIds) {
        const lastReadAt = readMap.get(convId) || '1970-01-01T00:00:00Z'

        const { count, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .is('deleted_at', null)
          .gt('created_at', lastReadAt)
          .neq('sender_id', userId)

        if (countError) {
          console.error('Error counting unread:', countError)
          continue
        }

        const unreadCount = count || 0
        if (unreadCount > 0) {
          byConversation[convId] = unreadCount
          total += unreadCount
        }
      }

      setCounts({ total, byConversation })
    } catch (error) {
      console.error('Failed to fetch unread counts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Mark a conversation as read (locally update counts)
  const markAsRead = useCallback((conversationId: string) => {
    setCounts((prev) => {
      const convCount = prev.byConversation[conversationId] || 0
      const { [conversationId]: _, ...restByConv } = prev.byConversation
      return {
        total: Math.max(0, prev.total - convCount),
        byConversation: restByConv,
      }
    })
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    // Subscribe to new messages across all conversations
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // New message from someone else - increment count
          const message = payload.new as { sender_id: string; conversation_id: string }
          if (message.sender_id !== userId) {
            setCounts((prev) => ({
              total: prev.total + 1,
              byConversation: {
                ...prev.byConversation,
                [message.conversation_id]:
                  (prev.byConversation[message.conversation_id] || 0) + 1,
              },
            }))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_read_status',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Read status changed - refetch counts
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refetch])

  return {
    totalUnread: counts.total,
    unreadByConversation: counts.byConversation,
    isLoading,
    refetch,
    markAsRead,
  }
}

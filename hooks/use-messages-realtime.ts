'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/api/conversations.shared'

interface UseMessagesRealtimeOptions {
  conversationId: string
  initialMessages: Message[]
}

/**
 * Hook to subscribe to real-time updates for conversation messages
 * Automatically refetches messages when changes occur
 */
export function useMessagesRealtime({
  conversationId,
  initialMessages,
}: UseMessagesRealtimeOptions) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isRefetching, setIsRefetching] = useState(false)
  const lastMessageCountRef = useRef(initialMessages.length)
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRefetchingRef = useRef(false)

  const refetch = useCallback(async () => {
    // Use ref for immediate check to prevent race conditions
    if (isRefetchingRef.current) return
    isRefetchingRef.current = true
    setIsRefetching(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, name, email),
          attachments:message_attachments(*),
          reactions:message_reactions(
            *,
            user:profiles!user_id(id, name)
          ),
          mentions:message_mentions(
            *,
            mentioned_user:profiles!mentioned_user_id(id, name, email)
          )
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages((data || []) as Message[])
      lastMessageCountRef.current = (data || []).length
    } catch (error) {
      console.error('Failed to refetch messages:', error)
    } finally {
      isRefetchingRef.current = false
      setIsRefetching(false)
    }
  }, [conversationId])

  // Debounced refetch to prevent multiple rapid calls
  const debouncedRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current)
    }
    refetchTimeoutRef.current = setTimeout(() => {
      refetch()
    }, 100)
  }, [refetch])

  // Append a new message optimistically (for local send)
  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message])
  }, [])

  // Update a message (for edits)
  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
    )
  }, [])

  // Remove a message (for deletes)
  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to messages table changes for this conversation
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // New message - debounced refetch to get full data with joins
          debouncedRefetch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // Message edited or deleted - debounced refetch
          debouncedRefetch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        () => {
          // Reaction changed - debounced refetch to update reactions
          debouncedRefetch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_attachments',
        },
        () => {
          // Attachment added/removed - debounced refetch
          debouncedRefetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      // Clean up debounce timeout
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current)
      }
    }
  }, [conversationId, debouncedRefetch])

  // Update when initial messages change (e.g., pagination load)
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  return {
    messages,
    isRefetching,
    refetch,
    appendMessage,
    updateMessage,
    removeMessage,
  }
}

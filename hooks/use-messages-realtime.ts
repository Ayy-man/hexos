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

  const refetch = useCallback(async () => {
    if (isRefetching) return
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
      setIsRefetching(false)
    }
  }, [conversationId, isRefetching])

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
          // New message - refetch to get full data with joins
          refetch()
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
          // Message edited or deleted - refetch
          refetch()
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
          // Reaction changed - refetch to update reactions
          refetch()
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
          // Attachment added/removed - refetch
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, refetch])

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

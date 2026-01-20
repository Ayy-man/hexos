'use server'

import { getSuggestionConversation } from '@/lib/api/suggestions'
import { getConversationMessages } from '@/lib/api/conversations'
import { createClient } from '@/lib/supabase/server'

export async function getSuggestionConversationAction(suggestionId: string) {
  return getSuggestionConversation(suggestionId)
}

export async function getConversationMessagesAction(conversationId: string) {
  return getConversationMessages(conversationId)
}

export async function getConversationParticipantsAction(suggestionId: string) {
  const supabase = await createClient()

  // For suggestion conversations, participants are:
  // 1. The suggestion author
  // 2. All admin/internal users

  const { data: suggestion } = await supabase
    .from('suggestions')
    .select('user_id')
    .eq('id', suggestionId)
    .single()

  const { data: admins } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('role', ['admin', 'internal'])

  const participants: Array<{ id: string; name: string; email: string }> = [...(admins || [])]

  // Add suggestion author if they're not already in the list
  if (suggestion?.user_id) {
    const { data: author } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', suggestion.user_id)
      .single()

    if (author && !participants.find(p => p.id === author.id)) {
      participants.push(author)
    }
  }

  return participants
}

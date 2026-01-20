import { createClient } from '@/lib/supabase/server'
import type { Conversation } from './conversations.shared'

export interface Suggestion {
  id: string
  user_id: string
  title: string
  description: string | null
  image_url: string | null
  status: 'new' | 'reviewed' | 'implemented' | 'declined'
  admin_notes: string | null
  created_at: string
  updated_at: string
  // Joined from profiles
  user_name?: string
  user_email?: string
  user_role?: string
}

export interface CreateSuggestionInput {
  title: string
  description?: string
  image_url?: string
}

export interface UpdateSuggestionInput {
  status?: 'new' | 'reviewed' | 'implemented' | 'declined'
  admin_notes?: string
}

// Upload image to Supabase storage
export async function uploadSuggestionImage(file: File, userId: string): Promise<string> {
  const supabase = await createClient()

  const fileExt = file.name.split('.').pop()
  const fileName = `suggestions/${userId}/${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('general-purpose')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Upload error:', error)
    throw new Error('Failed to upload image')
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('general-purpose')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

// Create a new suggestion
export async function createSuggestion(input: CreateSuggestionInput): Promise<Suggestion> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('suggestions')
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description || null,
      image_url: input.image_url || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Create suggestion error:', error)
    throw new Error('Failed to create suggestion')
  }

  return data as Suggestion
}

// Get all suggestions (admin only)
export async function getSuggestions(): Promise<Suggestion[]> {
  const supabase = await createClient()

  // First get suggestions without join (to avoid RLS issues on profiles)
  const { data: suggestions, error } = await supabase
    .from('suggestions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get suggestions error:', error)
    throw new Error('Failed to fetch suggestions')
  }

  if (!suggestions || suggestions.length === 0) {
    return []
  }

  // Get unique user IDs and fetch their profiles separately
  const userIds = [...new Set(suggestions.map(s => s.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .in('id', userIds)

  // Create a map of profiles for quick lookup
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

  // Transform the data
  return suggestions.map(suggestion => {
    const profile = profileMap.get(suggestion.user_id)
    return {
      ...suggestion,
      user_name: profile?.name || 'Unknown',
      user_email: profile?.email || '',
      user_role: profile?.role || '',
    }
  }) as Suggestion[]
}

// Get user's own suggestions
export async function getMySuggestions(): Promise<Suggestion[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get my suggestions error:', error)
    throw new Error('Failed to fetch suggestions')
  }

  return (data || []) as Suggestion[]
}

/**
 * Get the conversation thread for a suggestion
 */
export async function getSuggestionConversation(suggestionId: string): Promise<{
  conversation: Conversation | null
  suggestion: Suggestion | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get the suggestion first to verify access
  const { data: suggestion, error: suggestionError } = await supabase
    .from('suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single()

  if (suggestionError) {
    if (suggestionError.code === 'PGRST116') return { conversation: null, suggestion: null }
    throw suggestionError
  }

  // Get the associated conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('suggestion_id', suggestionId)
    .eq('type', 'suggestion')
    .single()

  if (convError) {
    if (convError.code === 'PGRST116') return { conversation: null, suggestion: suggestion as Suggestion }
    throw convError
  }

  return { conversation: conversation as Conversation, suggestion: suggestion as Suggestion }
}

// Update suggestion (admin only)
export async function updateSuggestion(id: string, input: UpdateSuggestionInput): Promise<Suggestion> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('suggestions')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Update suggestion error:', error)
    throw new Error('Failed to update suggestion')
  }

  return data as Suggestion
}

// Delete suggestion (admin only)
export async function deleteSuggestion(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('suggestions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Delete suggestion error:', error)
    throw new Error('Failed to delete suggestion')
  }
}

// Get suggestion counts by status (for badges)
export async function getSuggestionCounts(): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('suggestions')
    .select('status')

  if (error) {
    console.error('Get suggestion counts error:', error)
    return { new: 0, reviewed: 0, implemented: 0, declined: 0 }
  }

  const counts = { new: 0, reviewed: 0, implemented: 0, declined: 0 }
  data?.forEach(s => {
    const status = s.status as keyof typeof counts
    if (status in counts) counts[status]++
  })

  return counts
}

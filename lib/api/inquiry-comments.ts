import { createClient } from '@/lib/supabase/server'

// Types
export type CommentType = 'internal' | 'dfy' | 'proposal'

export interface InquiryComment {
  id: string
  inquiry_id: string
  content: string
  comment_type: CommentType
  anchor_id: string | null
  parent_id: string | null
  author_id: string
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  // Sync field for bidirectional sync with messages
  synced_message_id?: string | null
  author?: {
    id: string
    name: string
    email: string
  }
  replies?: InquiryComment[]
}

export interface CreateCommentInput {
  inquiry_id: string
  content: string
  comment_type?: CommentType
  anchor_id?: string | null
  parent_id?: string | null
}

export interface UpdateCommentInput {
  content: string
}

// Get all comments for an inquiry with author info
export async function getInquiryComments(
  inquiryId: string,
  commentType?: CommentType
): Promise<InquiryComment[]> {
  const supabase = await createClient()

  let query = supabase
    .from('inquiry_comments')
    .select(`
      *,
      author:profiles!author_id(id, name, email)
    `)
    .eq('inquiry_id', inquiryId)

  if (commentType) {
    query = query.eq('comment_type', commentType)
  }

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as InquiryComment[]
}

// Get a single comment by ID
export async function getInquiryComment(id: string): Promise<InquiryComment> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiry_comments')
    .select(`
      *,
      author:profiles!author_id(id, name, email)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as InquiryComment
}

// Create a new comment (and sync to messages for conversations)
export async function createInquiryComment(input: CreateCommentInput): Promise<InquiryComment> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('inquiry_comments')
    .insert({
      inquiry_id: input.inquiry_id,
      content: input.content,
      comment_type: input.comment_type || 'internal',
      anchor_id: input.anchor_id || null,
      parent_id: input.parent_id || null,
      author_id: user.id,
    })
    .select(`
      *,
      author:profiles!author_id(id, name, email)
    `)
    .single()

  if (error) throw error

  const comment = data as InquiryComment

  // Sync to messages for conversations view (skip inline anchor comments)
  if (!input.anchor_id) {
    await syncCommentToMessage(supabase, comment)
  }

  return comment
}

// Sync an inquiry comment to the messages table
async function syncCommentToMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  comment: InquiryComment
): Promise<void> {
  try {
    // Find the conversation linked to this inquiry
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('inquiry_id', comment.inquiry_id)
      .eq('type', 'inquiry')
      .single()

    if (convError || !conversation) {
      console.warn('[Sync] No conversation found for inquiry:', comment.inquiry_id)
      return
    }

    // Create the synced message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: comment.author_id,
        content: comment.content,
        created_at: comment.created_at,
        synced_inquiry_comment_id: comment.id,
      })
      .select('id')
      .single()

    if (msgError) {
      console.error('[Sync] Failed to create message:', msgError)
      return
    }

    // Update the comment with the synced message ID
    await supabase
      .from('inquiry_comments')
      .update({ synced_message_id: message.id })
      .eq('id', comment.id)
  } catch (err) {
    console.error('[Sync] Error syncing comment to message:', err)
  }
}

// Update a comment's content
export async function updateInquiryComment(id: string, input: UpdateCommentInput): Promise<InquiryComment> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiry_comments')
    .update({ content: input.content })
    .eq('id', id)
    .select(`
      *,
      author:profiles!author_id(id, name, email)
    `)
    .single()

  if (error) throw error
  return data as InquiryComment
}

// Delete a comment
export async function deleteInquiryComment(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiry_comments')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Resolve or unresolve a comment thread
export async function resolveInquiryComment(id: string, resolved: boolean): Promise<InquiryComment> {
  const supabase = await createClient()

  // Get current user for resolved_by
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const updateData: Record<string, unknown> = {
    resolved,
  }

  if (resolved) {
    updateData.resolved_by = user.id
    updateData.resolved_at = new Date().toISOString()
  } else {
    updateData.resolved_by = null
    updateData.resolved_at = null
  }

  const { data, error } = await supabase
    .from('inquiry_comments')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      author:profiles!author_id(id, name, email)
    `)
    .single()

  if (error) throw error
  return data as InquiryComment
}

// Get comments by anchor ID (for inline comments)
export async function getCommentsByAnchor(inquiryId: string, anchorId: string): Promise<InquiryComment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiry_comments')
    .select(`
      *,
      author:profiles!author_id(id, name, email)
    `)
    .eq('inquiry_id', inquiryId)
    .eq('anchor_id', anchorId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as InquiryComment[]
}

// Get unresolved comments count
export async function getUnresolvedCommentsCount(inquiryId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('inquiry_comments')
    .select('*', { count: 'exact', head: true })
    .eq('inquiry_id', inquiryId)
    .eq('resolved', false)
    .is('parent_id', null) // Only count top-level comments

  if (error) throw error
  return count || 0
}

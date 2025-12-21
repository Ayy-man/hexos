import { createClient } from '@/lib/supabase/server'

// Types
export interface InquiryComment {
  id: string
  inquiry_id: string
  content: string
  anchor_id: string | null
  parent_id: string | null
  author_id: string
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
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
  anchor_id?: string | null
  parent_id?: string | null
}

export interface UpdateCommentInput {
  content: string
}

// Get all comments for an inquiry with author info
export async function getInquiryComments(inquiryId: string): Promise<InquiryComment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiry_comments')
    .select(`
      *,
      author:profiles!author_id(id, name, email)
    `)
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true })

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

// Create a new comment
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
  return data as InquiryComment
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

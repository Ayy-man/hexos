import { createClient } from '@/lib/supabase/server'

// Types
export type NoteVisibility = 'team' | 'admin_only'

export interface DeliverableNote {
  id: string
  deliverable_id: string
  user_id: string
  content: string
  visibility: NoteVisibility
  from_status: string | null
  to_status: string | null
  created_at: string
  updated_at: string
  user?: {
    id: string
    name: string
  }
  deliverable?: {
    id: string
    title: string
    project_id: string
  }
}

/**
 * Add a note to a deliverable
 */
export async function addNote(params: {
  deliverableId: string
  content: string
  visibility?: NoteVisibility
}): Promise<DeliverableNote> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('deliverable_notes')
    .insert({
      deliverable_id: params.deliverableId,
      user_id: user.id,
      content: params.content,
      visibility: params.visibility || 'team',
    })
    .select(`
      *,
      user:profiles(id, name)
    `)
    .single()

  if (error) throw error
  return normalizeNoteRelations(data)
}

/**
 * Add a note with status change tracking
 */
export async function addStatusChangeNote(params: {
  deliverableId: string
  content: string
  fromStatus: string
  toStatus: string
  visibility?: NoteVisibility
}): Promise<DeliverableNote> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('deliverable_notes')
    .insert({
      deliverable_id: params.deliverableId,
      user_id: user.id,
      content: params.content,
      visibility: params.visibility || 'team',
      from_status: params.fromStatus,
      to_status: params.toStatus,
    })
    .select(`
      *,
      user:profiles(id, name)
    `)
    .single()

  if (error) throw error
  return normalizeNoteRelations(data)
}

/**
 * Get notes for a deliverable
 */
export async function getNotesForDeliverable(deliverableId: string): Promise<DeliverableNote[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverable_notes')
    .select(`
      *,
      user:profiles(id, name)
    `)
    .eq('deliverable_id', deliverableId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeNoteRelations)
}

/**
 * Get all notes for a project (across all deliverables)
 */
export async function getNotesForProject(projectId: string): Promise<DeliverableNote[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverable_notes')
    .select(`
      *,
      user:profiles(id, name),
      deliverable:deliverables!inner(id, title, project_id)
    `)
    .eq('deliverable.project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeNoteRelations)
}

/**
 * Get recent notes by current user
 */
export async function getMyRecentNotes(limit: number = 10): Promise<DeliverableNote[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('deliverable_notes')
    .select(`
      *,
      deliverable:deliverables(id, title, project_id)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(normalizeNoteRelations)
}

/**
 * Update a note
 */
export async function updateNote(noteId: string, content: string): Promise<DeliverableNote> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverable_notes')
    .update({ content })
    .eq('id', noteId)
    .select(`
      *,
      user:profiles(id, name)
    `)
    .single()

  if (error) throw error
  return normalizeNoteRelations(data)
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('deliverable_notes')
    .delete()
    .eq('id', noteId)

  if (error) throw error
}

/**
 * Get status change history for a deliverable
 */
export async function getStatusHistory(deliverableId: string): Promise<DeliverableNote[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverable_notes')
    .select(`
      *,
      user:profiles(id, name)
    `)
    .eq('deliverable_id', deliverableId)
    .not('from_status', 'is', null)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []).map(normalizeNoteRelations)
}

/**
 * Get note count for a deliverable
 */
export async function getNoteCount(deliverableId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('deliverable_notes')
    .select('*', { count: 'exact', head: true })
    .eq('deliverable_id', deliverableId)

  if (error) throw error
  return count || 0
}

// Helper to normalize relations from Supabase array format
function normalizeNoteRelations(note: Record<string, unknown>): DeliverableNote {
  const user = Array.isArray(note.user)
    ? note.user[0]
    : note.user
  const deliverable = Array.isArray(note.deliverable)
    ? note.deliverable[0]
    : note.deliverable

  return {
    ...note,
    user,
    deliverable,
  } as DeliverableNote
}

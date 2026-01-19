import { createClient } from '@/lib/supabase/server'

// Types
export type CheckinType = 'progress' | 'no_work' | 'delay'

export interface DevCheckin {
  id: string
  user_id: string
  project_id: string
  checkin_date: string
  checkin_type: CheckinType
  summary: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
  user?: {
    id: string
    name: string
    avatar_url?: string | null
  }
  notes?: CheckinNote[]
}

export interface CheckinNote {
  id: string
  checkin_id: string
  deliverable_id: string
  note: string | null
  position_before: number | null
  position_after: number | null
  position_delta: number | null
  created_at: string
  deliverable?: {
    id: string
    title: string
  }
}

export interface CheckinSnooze {
  id: string
  user_id: string
  snoozed_until: string
  created_at: string
}

export interface CreateCheckinInput {
  project_id: string
  checkin_date: string
  checkin_type: CheckinType
  summary?: string
  notes?: Array<{
    deliverable_id: string
    note?: string
    position_before?: number
    position_after?: number
    position_delta?: number
  }>
}

export interface UpdateCheckinInput {
  checkin_type?: CheckinType
  summary?: string
}

export interface DevLoggingStatus {
  needs_checkin: boolean
  last_checkin_date: string | null
  overdue_projects: string[]
  is_snoozed: boolean
  snoozed_until: string | null
}

// Get check-ins for a project
export async function getProjectCheckins(projectId: string): Promise<DevCheckin[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dev_checkins')
    .select(`
      *,
      user:profiles!user_id(id, name, avatar_url),
      notes:checkin_notes(
        *,
        deliverable:deliverables!deliverable_id(id, title)
      )
    `)
    .eq('project_id', projectId)
    .order('checkin_date', { ascending: false })

  if (error) throw error
  return data as DevCheckin[]
}

// Get check-ins for a user
export async function getUserCheckins(userId: string, limit?: number): Promise<DevCheckin[]> {
  const supabase = await createClient()

  let query = supabase
    .from('dev_checkins')
    .select(`
      *,
      notes:checkin_notes(
        *,
        deliverable:deliverables!deliverable_id(id, title)
      )
    `)
    .eq('user_id', userId)
    .order('checkin_date', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data as DevCheckin[]
}

// Get a single check-in
export async function getCheckin(id: string): Promise<DevCheckin> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dev_checkins')
    .select(`
      *,
      user:profiles!user_id(id, name, avatar_url),
      notes:checkin_notes(
        *,
        deliverable:deliverables!deliverable_id(id, title)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as DevCheckin
}

// Create a check-in with notes
export async function createCheckin(input: CreateCheckinInput): Promise<DevCheckin> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Create the check-in
  const { data: checkin, error: checkinError } = await supabase
    .from('dev_checkins')
    .insert({
      user_id: user.id,
      project_id: input.project_id,
      checkin_date: input.checkin_date,
      checkin_type: input.checkin_type,
      summary: input.summary || null,
    })
    .select()
    .single()

  if (checkinError) throw checkinError

  // Create notes if provided
  if (input.notes && input.notes.length > 0) {
    const notesData = input.notes.map((note) => ({
      checkin_id: checkin.id,
      deliverable_id: note.deliverable_id,
      note: note.note || null,
      position_before: note.position_before ?? null,
      position_after: note.position_after ?? null,
      position_delta: note.position_delta ?? null,
    }))

    const { error: notesError } = await supabase
      .from('checkin_notes')
      .insert(notesData)

    if (notesError) throw notesError

    // Update deliverable positions if position_after is set
    for (const note of input.notes) {
      if (note.position_after !== undefined) {
        await supabase
          .from('deliverables')
          .update({ hill_position: note.position_after })
          .eq('id', note.deliverable_id)

        // Log to position history
        await supabase
          .from('deliverable_position_history')
          .insert({
            deliverable_id: note.deliverable_id,
            position: note.position_after,
            note: note.note || null,
            created_by: user.id,
            checkin_id: checkin.id,
          })
      }
    }
  }

  // Return full check-in with notes
  return getCheckin(checkin.id)
}

// Update a check-in
export async function updateCheckin(id: string, input: UpdateCheckinInput): Promise<DevCheckin> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dev_checkins')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return getCheckin(data.id)
}

// Update a check-in note
export async function updateCheckinNote(
  noteId: string,
  updates: { note?: string; position_after?: number; position_delta?: number }
): Promise<CheckinNote> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('checkin_notes')
    .update(updates)
    .eq('id', noteId)
    .select(`
      *,
      deliverable:deliverables!deliverable_id(id, title)
    `)
    .single()

  if (error) throw error
  return data as CheckinNote
}

// Get dev logging status
export async function getDevLoggingStatus(): Promise<DevLoggingStatus> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      needs_checkin: false,
      last_checkin_date: null,
      overdue_projects: [],
      is_snoozed: false,
      snoozed_until: null,
    }
  }

  const { data, error } = await supabase.rpc('get_dev_logging_status', {
    p_user_id: user.id,
  })

  if (error) throw error

  const status = data?.[0] || {
    needs_checkin: false,
    last_checkin_date: null,
    overdue_projects: [],
    is_snoozed: false,
    snoozed_until: null,
  }

  return status as DevLoggingStatus
}

// Snooze check-in reminders
export async function snoozeCheckinReminder(hours: number = 24): Promise<CheckinSnooze> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

  // Upsert the snooze
  const { data, error } = await supabase
    .from('checkin_snoozes')
    .upsert({
      user_id: user.id,
      snoozed_until: snoozedUntil,
    })
    .select()
    .single()

  if (error) throw error
  return data as CheckinSnooze
}

// Clear snooze
export async function clearCheckinSnooze(): Promise<void> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('checkin_snoozes')
    .delete()
    .eq('user_id', user.id)

  if (error) throw error
}

// Check if check-in is editable (not locked)
export function isCheckinEditable(checkin: DevCheckin): boolean {
  if (!checkin.locked_at) return true
  return new Date(checkin.locked_at) > new Date()
}

/**
 * Meeting API
 * CRUD operations for meetings with Recall.ai bot dispatch
 */

import { createClient } from '@/lib/supabase/admin'
import { recall } from '@/lib/recall/client'
import type {
  Meeting,
  MeetingWithLinks,
  MeetingPlatform,
  MeetingLinkableType,
  CreateMeetingInput,
  MeetingLink,
  MeetingParticipant,
  MeetingTask,
} from '@/lib/types/meetings'

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/**
 * Detect meeting platform from URL
 */
export function detectPlatform(url: string): MeetingPlatform {
  const normalized = url.toLowerCase()

  if (normalized.includes('zoom.us')) {
    return 'zoom'
  }
  if (normalized.includes('meet.google.com')) {
    return 'google_meet'
  }
  if (normalized.includes('teams.microsoft.com') || normalized.includes('teams.live.com')) {
    return 'teams'
  }

  return 'other'
}

// ============================================================================
// MEETING CRUD
// ============================================================================

/**
 * Get all meetings with optional filters
 */
export async function getMeetings(filters?: {
  status?: string
  projectId?: string
  inquiryId?: string
  from?: string
  to?: string
  limit?: number
}): Promise<Meeting[]> {
  const supabase = createClient()

  let query = supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.from) {
    query = query.gte('created_at', filters.from)
  }

  if (filters?.to) {
    query = query.lte('created_at', filters.to)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching meetings:', error)
    return []
  }

  let meetings = data || []

  // Filter by project/inquiry if specified (via meeting_links join)
  if (filters?.projectId || filters?.inquiryId) {
    const linksQuery = supabase
      .from('meeting_links')
      .select('meeting_id')

    if (filters.projectId) {
      linksQuery.eq('linkable_type', 'project').eq('linkable_id', filters.projectId)
    } else if (filters.inquiryId) {
      linksQuery.eq('linkable_type', 'inquiry').eq('linkable_id', filters.inquiryId)
    }

    const { data: links } = await linksQuery

    if (links) {
      const meetingIds = new Set(links.map(l => l.meeting_id))
      meetings = meetings.filter(m => meetingIds.has(m.id))
    }
  }

  return meetings as Meeting[]
}

/**
 * Get single meeting with all related data
 */
export async function getMeeting(id: string): Promise<MeetingWithLinks | null> {
  const supabase = createClient()

  // Get meeting
  const { data: meeting, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !meeting) {
    console.error('Error fetching meeting:', error)
    return null
  }

  // Get meeting links with joined names
  const { data: links } = await supabase
    .from('meeting_links')
    .select(`
      *,
      projects:linkable_id(name),
      inquiries:linkable_id(title)
    `)
    .eq('meeting_id', id)

  // Get participants
  const { data: participants } = await supabase
    .from('meeting_participants')
    .select('*')
    .eq('meeting_id', id)
    .order('created_at', { ascending: true })

  // Get tasks
  const { data: tasks } = await supabase
    .from('meeting_tasks')
    .select('*')
    .eq('meeting_id', id)
    .order('created_at', { ascending: false })

  // Transform links to include names
  const transformedLinks = (links || []).map((link: any) => {
    const result: MeetingLink & { project_name?: string; inquiry_title?: string } = {
      id: link.id,
      meeting_id: link.meeting_id,
      linkable_type: link.linkable_type,
      linkable_id: link.linkable_id,
      created_at: link.created_at,
    }

    if (link.linkable_type === 'project' && link.projects) {
      result.project_name = Array.isArray(link.projects) ? link.projects[0]?.name : link.projects?.name
    }
    if (link.linkable_type === 'inquiry' && link.inquiries) {
      result.inquiry_title = Array.isArray(link.inquiries) ? link.inquiries[0]?.title : link.inquiries?.title
    }

    return result
  })

  return {
    ...meeting,
    links: transformedLinks,
    participants: (participants || []) as MeetingParticipant[],
    tasks: (tasks || []) as MeetingTask[],
  } as MeetingWithLinks
}

/**
 * Create meeting record + dispatch Recall.ai bot + create meeting_links
 */
export async function createMeeting(
  input: CreateMeetingInput,
  userId: string
): Promise<{ success: boolean; data?: Meeting; error?: string }> {
  const supabase = createClient()

  // Detect platform
  const platform = detectPlatform(input.meeting_url)

  // Insert meeting
  const { data: meeting, error: insertError } = await supabase
    .from('meetings')
    .insert({
      title: input.title,
      meeting_url: input.meeting_url,
      platform,
      scheduled_at: input.scheduled_at || null,
      status: 'pending',
      created_by: userId,
    })
    .select()
    .single()

  if (insertError || !meeting) {
    console.error('Error creating meeting:', insertError)
    return { success: false, error: insertError?.message || 'Failed to create meeting' }
  }

  // Try to dispatch Recall.ai bot
  try {
    const bot = await recall.createBot({
      meeting_url: input.meeting_url,
      bot_name: 'Hexos Notetaker',
    })

    // Update meeting with bot ID and status
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        recall_bot_id: bot.id,
        status: 'joining',
      })
      .eq('id', meeting.id)

    if (updateError) {
      console.error('Error updating meeting with bot ID:', updateError)
      // Don't fail the whole operation
    } else {
      // Update local meeting object
      meeting.recall_bot_id = bot.id
      meeting.status = 'joining'
    }
  } catch (botError: any) {
    console.error('Failed to dispatch Recall.ai bot:', botError)
    // Don't fail the whole creation - meeting still exists with status 'pending'
    // User can retry bot dispatch later
  }

  // Create meeting links if provided
  if (input.links && input.links.length > 0) {
    const linkInserts = input.links.map(link => ({
      meeting_id: meeting.id,
      linkable_type: link.type,
      linkable_id: link.id,
    }))

    const { error: linkError } = await supabase
      .from('meeting_links')
      .insert(linkInserts)

    if (linkError) {
      console.error('Error creating meeting links:', linkError)
      // Don't fail the whole operation
    }
  }

  return { success: true, data: meeting as Meeting }
}

/**
 * Update meeting title
 */
export async function updateMeeting(
  id: string,
  updates: { title?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating meeting:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Delete meeting (cascade handles related rows)
 */
export async function deleteMeeting(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting meeting:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================================================
// MEETING LINKS
// ============================================================================

/**
 * Add a meeting link
 */
export async function addMeetingLink(
  meetingId: string,
  linkableType: MeetingLinkableType,
  linkableId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('meeting_links')
    .insert({
      meeting_id: meetingId,
      linkable_type: linkableType,
      linkable_id: linkableId,
    })

  if (error) {
    console.error('Error adding meeting link:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Remove a meeting link
 */
export async function removeMeetingLink(
  linkId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('meeting_links')
    .delete()
    .eq('id', linkId)

  if (error) {
    console.error('Error removing meeting link:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get all meetings linked to a specific project/inquiry
 */
export async function getMeetingsForEntity(
  linkableType: MeetingLinkableType,
  linkableId: string
): Promise<Meeting[]> {
  const supabase = createClient()

  // Get meeting IDs from links
  const { data: links, error: linksError } = await supabase
    .from('meeting_links')
    .select('meeting_id')
    .eq('linkable_type', linkableType)
    .eq('linkable_id', linkableId)

  if (linksError || !links) {
    console.error('Error fetching meeting links:', linksError)
    return []
  }

  if (links.length === 0) {
    return []
  }

  const meetingIds = links.map(l => l.meeting_id)

  // Fetch meetings
  const { data: meetings, error: meetingsError } = await supabase
    .from('meetings')
    .select('*')
    .in('id', meetingIds)
    .order('created_at', { ascending: false })

  if (meetingsError) {
    console.error('Error fetching meetings for entity:', meetingsError)
    return []
  }

  return (meetings || []) as Meeting[]
}

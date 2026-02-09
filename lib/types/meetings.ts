/**
 * Meeting Assistant Types
 * Manual type definitions for meetings, meeting_links, meeting_participants, meeting_tasks
 */

// Meeting types
export type MeetingPlatform = 'zoom' | 'google_meet' | 'teams' | 'other'
export type MeetingStatus = 'pending' | 'joining' | 'recording' | 'processing' | 'ready' | 'failed'
export type MeetingTaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type MeetingTaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'
export type MeetingTaskSource = 'ai_extracted' | 'manual' | 'imported'
export type MeetingLinkableType = 'project' | 'inquiry' | 'conversation'

export interface TranscriptSegment {
  speaker: string
  text: string
  start_time: number
  end_time: number
}

export interface KeyDecision {
  decision: string
  context: string
}

export interface Meeting {
  id: string
  title: string
  meeting_url: string
  platform: MeetingPlatform
  recall_bot_id: string | null
  recall_recording_url: string | null
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  transcript: TranscriptSegment[] | null
  summary: string | null
  key_decisions: KeyDecision[] | null
  status: MeetingStatus
  error_message: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface MeetingLink {
  id: string
  meeting_id: string
  linkable_type: MeetingLinkableType
  linkable_id: string
  created_at: string
}

export interface MeetingParticipant {
  id: string
  meeting_id: string
  display_name: string
  email: string | null
  profile_id: string | null
  speaker_label: string | null
  created_at: string
}

export interface MeetingTask {
  id: string
  meeting_id: string | null
  title: string
  description: string | null
  assigned_to_name: string | null
  assigned_to_profile: string | null
  due_date: string | null
  priority: MeetingTaskPriority
  status: MeetingTaskStatus
  project_id: string | null
  inquiry_id: string | null
  deliverable_id: string | null
  source: MeetingTaskSource
  created_by: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

// Input types
export interface CreateMeetingInput {
  title: string
  meeting_url: string
  scheduled_at?: string
  links?: { type: MeetingLinkableType; id: string }[]
}

export interface CreateMeetingTaskInput {
  title: string
  description?: string
  assigned_to_name?: string
  assigned_to_profile?: string
  due_date?: string
  priority?: MeetingTaskPriority
  meeting_id?: string
  project_id?: string
  inquiry_id?: string
}

export interface UpdateMeetingTaskInput {
  title?: string
  description?: string
  assigned_to_name?: string
  assigned_to_profile?: string
  due_date?: string | null
  priority?: MeetingTaskPriority
  status?: MeetingTaskStatus
  project_id?: string | null
  inquiry_id?: string | null
  deliverable_id?: string | null
}

// Extended types with joins
export interface MeetingWithLinks extends Meeting {
  links: (MeetingLink & {
    project_name?: string
    inquiry_title?: string
  })[]
  participants: MeetingParticipant[]
  tasks: MeetingTask[]
}

// AI extraction result type
export interface MeetingAIExtraction {
  summary: string[]
  tasks: {
    title: string
    description: string | null
    assigned_to: string | null
    due_date: string | null
    priority: MeetingTaskPriority
  }[]
  key_decisions: KeyDecision[]
  suggested_links: {
    type: 'project' | 'inquiry'
    name: string
    reason: string
  }[]
}

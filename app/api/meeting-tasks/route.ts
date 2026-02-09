/**
 * Meeting Tasks API - List and Create
 * GET /api/meeting-tasks - List tasks with filters
 * POST /api/meeting-tasks - Create new task
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMeetingTasks, createMeetingTask } from '@/lib/api/meeting-tasks'
import type {
  MeetingTaskStatus,
  MeetingTaskSource,
  CreateMeetingTaskInput,
} from '@/lib/types/meetings'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams

  // Parse filters from query params
  const filters: any = {}

  const meetingId = searchParams.get('meeting_id')
  if (meetingId) filters.meeting_id = meetingId

  const projectId = searchParams.get('project_id')
  if (projectId) filters.project_id = projectId

  const inquiryId = searchParams.get('inquiry_id')
  if (inquiryId) filters.inquiry_id = inquiryId

  const status = searchParams.get('status')
  if (status) filters.status = status as MeetingTaskStatus

  const assignedTo = searchParams.get('assigned_to')
  if (assignedTo) filters.assigned_to = assignedTo

  const dueBefore = searchParams.get('due_before')
  if (dueBefore) filters.due_before = dueBefore

  const source = searchParams.get('source')
  if (source) filters.source = source as MeetingTaskSource

  const limit = searchParams.get('limit')
  if (limit) filters.limit = parseInt(limit, 10)

  const tasks = await getMeetingTasks(filters)

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as CreateMeetingTaskInput
    const result = await createMeetingTask(body, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error: any) {
    console.error('Error creating meeting task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

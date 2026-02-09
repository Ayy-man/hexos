/**
 * Export Meeting Tasks as CSV
 * GET /api/meeting-tasks/export
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMeetingTasks } from '@/lib/api/meeting-tasks'
import { generateTasksCSV } from '@/features/meetings/lib/csv-utils'
import type { MeetingTaskStatus, MeetingTaskSource } from '@/lib/types/meetings'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams

  // Parse filters from query params (same as list endpoint)
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

  // Fetch tasks
  const tasks = await getMeetingTasks(filters)

  // Generate CSV
  const csvContent = generateTasksCSV(tasks)

  // Generate filename with current date
  const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const filename = `meeting-tasks-${date}.csv`

  // Return CSV file
  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

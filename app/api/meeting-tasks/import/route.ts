/**
 * Import Meeting Tasks from CSV
 * POST /api/meeting-tasks/import
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { parseTasksCSV, type ParsedTask } from '@/features/meetings/lib/csv-utils'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get form data
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file as text
    const csvText = await file.text()

    // Parse CSV
    const parseResult = parseTasksCSV(csvText)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error,
          errors: parseResult.errors,
        },
        { status: 400 }
      )
    }

    const tasks = parseResult.tasks || []

    // Get optional query params for applying to all imported tasks
    const searchParams = req.nextUrl.searchParams
    const meetingId = searchParams.get('meeting_id')
    const projectId = searchParams.get('project_id')
    const inquiryId = searchParams.get('inquiry_id')

    // Use admin client for bulk insert
    const adminClient = createAdminClient()

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    // Process each task
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]

      try {
        // Try to match assigned_to name to profile (best-effort ILIKE match)
        let assignedToProfile: string | null = null
        if (task.assigned_to_name) {
          const { data: profiles } = await adminClient
            .from('profiles')
            .select('id, display_name, email')
            .or(
              `display_name.ilike.%${task.assigned_to_name}%,email.ilike.%${task.assigned_to_name}%`
            )
            .limit(1)

          if (profiles && profiles.length > 0) {
            assignedToProfile = profiles[0].id
          }
        }

        // Build insert object
        const insertData: any = {
          title: task.title,
          description: task.description || null,
          assigned_to_name: task.assigned_to_name || null,
          assigned_to_profile: assignedToProfile,
          due_date: task.due_date || null,
          priority: task.priority,
          status: task.status,
          source: 'imported',
          created_by: user.id,
        }

        // Apply context from query params
        if (meetingId) insertData.meeting_id = meetingId
        if (projectId) insertData.project_id = projectId
        if (inquiryId) insertData.inquiry_id = inquiryId

        // Insert task
        const { error } = await adminClient
          .from('meeting_tasks')
          .insert(insertData)

        if (error) {
          skipped++
          errors.push(`Row ${i + 2}: ${error.message}`)
        } else {
          imported++
        }
      } catch (err: any) {
        skipped++
        errors.push(`Row ${i + 2}: ${err.message}`)
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors,
    })
  } catch (error: any) {
    console.error('Error importing meeting tasks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

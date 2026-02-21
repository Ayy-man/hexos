import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'

// Look ahead window in days
const LOOK_AHEAD_DAYS = 3

// Deduplication window: do not re-notify within 24 hours
const DEDUP_HOURS = 24

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET || ''}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  const now = new Date()
  const lookAheadDate = new Date(now.getTime() + LOOK_AHEAD_DAYS * 24 * 60 * 60 * 1000)

  // Fetch deliverables with upcoming due dates (within LOOK_AHEAD_DAYS days from now)
  // Exclude completed or done deliverables
  const { data: deliverables, error: deliverablesError } = await supabase
    .from('deliverables')
    .select('id, title, due_date, project_id, projects(id, project_name)')
    .not('status', 'in', '("done","completed","approved")')
    .gte('due_date', now.toISOString().split('T')[0]) // not already past
    .lte('due_date', lookAheadDate.toISOString().split('T')[0])
    .not('due_date', 'is', null)

  if (deliverablesError) {
    console.error('[deadline-reminders] Failed to fetch deliverables:', deliverablesError)
    return NextResponse.json({ error: deliverablesError.message }, { status: 500 })
  }

  if (!deliverables || deliverables.length === 0) {
    return NextResponse.json({ processed: 0, notified: 0 })
  }

  // Fetch admin and internal user IDs
  const { data: admins, error: adminsError } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'internal'])

  if (adminsError) {
    console.error('[deadline-reminders] Failed to fetch admins:', adminsError)
    return NextResponse.json({ error: adminsError.message }, { status: 500 })
  }

  const adminIds = (admins ?? []).map((a) => a.id)

  const dedupCutoff = new Date(now.getTime() - DEDUP_HOURS * 60 * 60 * 1000).toISOString()

  let processed = 0
  let notifiedCount = 0

  for (const deliverable of deliverables) {
    processed++

    // Deduplication: check for existing deadline_reminder for this deliverable in last 24h
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'deadline_reminder')
      .eq('project_id', deliverable.project_id)
      .gte('created_at', dedupCutoff)
      .limit(1)

    if (existing && existing.length > 0) {
      // Already notified in dedup window
      continue
    }

    // Fetch assigned devs for this project
    const { data: assignments } = await supabase
      .from('project_assignments')
      .select('dev_id')
      .eq('project_id', deliverable.project_id)

    const projectRaw = Array.isArray(deliverable.projects)
      ? deliverable.projects[0]
      : deliverable.projects
    const projectName = (projectRaw as { project_name?: string } | null)?.project_name ?? 'Unknown Project'

    const dueDate = new Date(deliverable.due_date)
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    const urgency = daysUntilDue <= 1 ? 'tomorrow' : `in ${daysUntilDue} days`

    const notificationTitle = 'Deadline Approaching'
    const notificationMessage = `"${deliverable.title}" in ${projectName} is due ${urgency}`

    // Build deduplicated recipient set: devs + admins
    const recipientSet = new Set<string>()

    for (const assignment of assignments ?? []) {
      if (assignment.dev_id) recipientSet.add(assignment.dev_id)
    }

    for (const adminId of adminIds) {
      recipientSet.add(adminId)
    }

    const inserts = Array.from(recipientSet).map((userId) => ({
      user_id: userId,
      type: 'deadline_reminder',
      title: notificationTitle,
      message: notificationMessage,
      project_id: deliverable.project_id,
      deliverable_id: deliverable.id,
    }))

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('notifications').insert(inserts)

      if (insertError) {
        console.error(`[deadline-reminders] Failed to insert notifications for deliverable ${deliverable.id}:`, insertError)
      } else {
        notifiedCount += inserts.length
      }
    }
  }

  return NextResponse.json({
    processed,
    notified: notifiedCount,
  })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'

// Cadence in days
const CADENCE_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

// Deduplication window: do not re-notify within 24 hours
const DEDUP_HOURS = 24

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET || ''}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  // Fetch all retainer projects with cadence set
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, project_name, retainer_started_at, check_in_cadence, retainer_dev_ids')
    .eq('project_status', 'retainer')
    .not('retainer_started_at', 'is', null)
    .not('check_in_cadence', 'is', null)

  if (projectsError) {
    console.error('[check-in-overdue] Failed to fetch retainer projects:', projectsError)
    return NextResponse.json({ error: projectsError.message }, { status: 500 })
  }

  if (!projects || projects.length === 0) {
    return NextResponse.json({ overdueCount: 0, notified: 0 })
  }

  // Fetch the most recent check-in per project
  const projectIds = projects.map((p) => p.id)

  const { data: latestCheckIns, error: checkInsError } = await supabase
    .from('retainer_check_ins')
    .select('project_id, created_at')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })

  if (checkInsError) {
    console.error('[check-in-overdue] Failed to fetch check-ins:', checkInsError)
    return NextResponse.json({ error: checkInsError.message }, { status: 500 })
  }

  // Build map: projectId -> most recent check-in date
  const lastCheckInMap = new Map<string, string>()
  for (const ci of latestCheckIns ?? []) {
    if (!lastCheckInMap.has(ci.project_id)) {
      lastCheckInMap.set(ci.project_id, ci.created_at)
    }
  }

  // Fetch admin and internal user IDs for batch notification
  const { data: admins, error: adminsError } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'internal'])

  if (adminsError) {
    console.error('[check-in-overdue] Failed to fetch admins:', adminsError)
    return NextResponse.json({ error: adminsError.message }, { status: 500 })
  }

  const adminIds = (admins ?? []).map((a) => a.id)

  const now = new Date()
  const dedupCutoff = new Date(now.getTime() - DEDUP_HOURS * 60 * 60 * 1000).toISOString()

  let overdueCount = 0
  let notifiedCount = 0

  for (const project of projects) {
    const cadenceDays = CADENCE_DAYS[project.check_in_cadence ?? ''] ?? 7
    const lastCheckInRaw = lastCheckInMap.get(project.id) ?? project.retainer_started_at
    if (!lastCheckInRaw) continue

    const lastCheckIn = new Date(lastCheckInRaw)
    const nextDueDate = new Date(lastCheckIn.getTime() + cadenceDays * 24 * 60 * 60 * 1000)

    if (nextDueDate > now) {
      // Not overdue yet
      continue
    }

    overdueCount++

    // Deduplication: check if we already sent a notification for this project recently
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'retainer_check_in_overdue')
      .eq('project_id', project.id)
      .gte('created_at', dedupCutoff)
      .limit(1)

    if (existing && existing.length > 0) {
      // Already notified in dedup window
      continue
    }

    // Collect recipients: assigned devs + admins (deduplicated)
    const recipientSet = new Set<string>()

    for (const devId of project.retainer_dev_ids ?? []) {
      recipientSet.add(devId)
    }

    for (const adminId of adminIds) {
      recipientSet.add(adminId)
    }

    const overdueByDays = Math.floor((now.getTime() - nextDueDate.getTime()) / (24 * 60 * 60 * 1000))
    const notificationTitle = 'Check-in Overdue'
    const notificationMessage = `Check-in for "${project.project_name}" is ${overdueByDays} day${overdueByDays !== 1 ? 's' : ''} overdue`

    const inserts = Array.from(recipientSet).map((userId) => ({
      user_id: userId,
      type: 'retainer_check_in_overdue',
      title: notificationTitle,
      message: notificationMessage,
      project_id: project.id,
    }))

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('notifications').insert(inserts)

      if (insertError) {
        console.error(`[check-in-overdue] Failed to insert notifications for project ${project.id}:`, insertError)
      } else {
        notifiedCount += inserts.length
      }
    }
  }

  return NextResponse.json({
    overdueCount,
    notified: notifiedCount,
  })
}

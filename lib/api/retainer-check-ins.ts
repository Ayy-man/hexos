import { createClient } from '@/lib/supabase/server'

export type CheckInHealth = 'green' | 'yellow' | 'red'

export interface RetainerCheckIn {
  id: string
  project_id: string
  health: CheckInHealth
  notes: string | null
  submitted_by: string
  due_date: string | null
  created_at: string
  submitter?: {
    id: string
    name: string
  }
}

export interface LogCheckInInput {
  projectId: string
  health: CheckInHealth
  notes?: string
}

/**
 * Get all check-ins for a project, ordered by newest first
 */
export async function getRetainerCheckIns(projectId: string): Promise<RetainerCheckIn[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('retainer_check_ins')
    .select(`
      *,
      submitter:profiles!submitted_by(id, name)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return normalizeCheckInRelations(data || [])
}

/**
 * Log a new check-in for a project
 */
export async function logCheckIn(input: LogCheckInInput): Promise<RetainerCheckIn> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('retainer_check_ins')
    .insert({
      project_id: input.projectId,
      health: input.health,
      notes: input.notes || null,
      submitted_by: user.id,
    })
    .select(`
      *,
      submitter:profiles!submitted_by(id, name)
    `)
    .single()

  if (error) throw error
  return normalizeCheckInRelations([data])[0]
}

/**
 * Get the most recent check-in for a project (for dashboard display)
 */
export async function getLatestCheckIn(projectId: string): Promise<RetainerCheckIn | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('retainer_check_ins')
    .select(`
      *,
      submitter:profiles!submitted_by(id, name)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return normalizeCheckInRelations([data])[0]
}

/**
 * Calculate the next check-in due date based on project's check_in_cadence
 */
export async function getNextCheckInDueDate(projectId: string): Promise<{
  dueDate: string
  isOverdue: boolean
}> {
  const supabase = await createClient()

  // Fetch project's check-in cadence and retainer_started_at
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('check_in_cadence, retainer_started_at')
    .eq('id', projectId)
    .single()

  if (projectError) throw projectError
  if (!project.check_in_cadence) throw new Error('Project has no check-in cadence configured')

  // Get most recent check-in
  const { data: latestCheckIn, error: checkInError } = await supabase
    .from('retainer_check_ins')
    .select('created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (checkInError) throw checkInError

  // Determine cadence in days
  const cadenceDays = {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
  }[project.check_in_cadence]

  // Calculate due date
  let baseDate: Date
  if (latestCheckIn) {
    baseDate = new Date(latestCheckIn.created_at)
  } else if (project.retainer_started_at) {
    baseDate = new Date(project.retainer_started_at)
  } else {
    // Fallback to today if no data available
    baseDate = new Date()
  }

  const dueDate = new Date(baseDate)
  dueDate.setDate(dueDate.getDate() + cadenceDays)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDateOnly = new Date(dueDate)
  dueDateOnly.setHours(0, 0, 0, 0)

  return {
    dueDate: dueDate.toISOString(),
    isOverdue: dueDateOnly < today,
  }
}

// Helper to normalize relations from Supabase array format
function normalizeCheckInRelations(checkIns: Record<string, unknown>[]): RetainerCheckIn[] {
  return checkIns.map((checkIn) => {
    const submitter = Array.isArray(checkIn.submitter)
      ? checkIn.submitter[0]
      : checkIn.submitter

    return {
      ...checkIn,
      submitter,
    } as RetainerCheckIn
  })
}

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/api/notifications'
import type { NotificationType } from '@/lib/api/notifications-utils'

// ============================================================================
// Shared param types
// ============================================================================

interface BaseNotificationParams {
  type: NotificationType
  title: string
  message?: string
  projectId?: string
  actorId?: string
}

// ============================================================================
// notifyAdmins
// ============================================================================

/**
 * Send a notification to all admin and internal users.
 *
 * Fire-and-forget: errors are logged but not thrown.
 * The caller is not blocked by individual delivery failures.
 */
export async function notifyAdmins(params: BaseNotificationParams): Promise<void> {
  try {
    const supabase = createAdminClient()

    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'internal'])

    if (error) {
      console.error('[notifyAdmins] Failed to fetch admin profiles:', error)
      return
    }

    if (!admins || admins.length === 0) return

    // Exclude the actor from receiving their own notification
    const recipients = params.actorId
      ? admins.filter((a) => a.id !== params.actorId)
      : admins

    await Promise.allSettled(
      recipients.map((admin) =>
        createNotification({
          userId: admin.id,
          type: params.type,
          title: params.title,
          message: params.message,
          projectId: params.projectId,
          actorId: params.actorId,
        })
      )
    )
  } catch (err) {
    console.error('[notifyAdmins] Unexpected error:', err)
  }
}

// ============================================================================
// notifyProjectStakeholders
// ============================================================================

interface NotifyProjectStakeholdersParams extends BaseNotificationParams {
  projectId: string
  excludeUserId?: string
}

/**
 * Send a notification to all project stakeholders:
 * - The DFY partner assigned to the project
 * - All developers assigned via project_assignments
 * - All admin and internal users
 *
 * Deduplicates recipients and respects excludeUserId to prevent
 * self-notifications.
 */
export async function notifyProjectStakeholders(
  params: NotifyProjectStakeholdersParams
): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Fetch project DFY partner
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('dfy_partner_id')
      .eq('id', params.projectId)
      .single()

    if (projectError) {
      console.error('[notifyProjectStakeholders] Failed to fetch project:', projectError)
      return
    }

    // Fetch project developer assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('project_assignments')
      .select('dev_id')
      .eq('project_id', params.projectId)

    if (assignmentsError) {
      console.error(
        '[notifyProjectStakeholders] Failed to fetch project assignments:',
        assignmentsError
      )
    }

    // Fetch admin and internal users
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'internal'])

    if (adminsError) {
      console.error('[notifyProjectStakeholders] Failed to fetch admins:', adminsError)
    }

    // Build deduplicated recipient set
    const recipientSet = new Set<string>()

    if (project?.dfy_partner_id) {
      recipientSet.add(project.dfy_partner_id)
    }

    for (const assignment of assignments ?? []) {
      if (assignment.dev_id) recipientSet.add(assignment.dev_id)
    }

    for (const admin of admins ?? []) {
      recipientSet.add(admin.id)
    }

    // Remove excluded user (actor self-notification prevention)
    if (params.excludeUserId) {
      recipientSet.delete(params.excludeUserId)
    }

    await Promise.allSettled(
      Array.from(recipientSet).map((userId) =>
        createNotification({
          userId,
          type: params.type,
          title: params.title,
          message: params.message,
          projectId: params.projectId,
          actorId: params.actorId,
        })
      )
    )
  } catch (err) {
    console.error('[notifyProjectStakeholders] Unexpected error:', err)
  }
}

// ============================================================================
// notifyUsers
// ============================================================================

interface NotifyUsersParams extends BaseNotificationParams {
  userIds: string[]
}

/**
 * Send a notification to an arbitrary list of users.
 *
 * Fire-and-forget: errors are logged but not thrown.
 * Useful when the caller already knows the exact set of recipients.
 */
export async function notifyUsers(params: NotifyUsersParams): Promise<void> {
  if (params.userIds.length === 0) return

  try {
    await Promise.allSettled(
      params.userIds.map((userId) =>
        createNotification({
          userId,
          type: params.type,
          title: params.title,
          message: params.message,
          projectId: params.projectId,
          actorId: params.actorId,
        })
      )
    )
  } catch (err) {
    console.error('[notifyUsers] Unexpected error:', err)
  }
}

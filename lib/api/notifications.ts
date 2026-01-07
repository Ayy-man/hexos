import { createClient } from '@/lib/supabase/server'

// Types
export type NotificationType =
  | 'project_assigned'
  | 'blocker_acknowledged'
  | 'blocker_resolved'
  | 'blocker_comment'
  | 'admin_comment'
  | 'mention'
  | 'deadline_reminder'
  | 'status_change'
  | 'invoice_sent'
  | 'invoice_paid'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  project_id: string | null
  deliverable_id: string | null
  blocker_id: string | null
  actor_id: string | null
  read_at: string | null
  created_at: string
  actor?: {
    id: string
    name: string
  }
  project?: {
    id: string
    project_name: string
  }
}

/**
 * Get notifications for current user
 */
export async function getMyNotifications(
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  let query = supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!actor_id(id, name),
      project:projects(id, project_name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []).map(normalizeNotificationRelations)
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)

  if (error) throw error
  return count || 0
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string): Promise<Notification> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select(`
      *,
      actor:profiles!actor_id(id, name),
      project:projects(id, project_name)
    `)
    .single()

  if (error) throw error
  return normalizeNotificationRelations(data)
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return 0

  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
    .select('id')

  if (error) throw error
  return (data || []).length
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) throw error
}

/**
 * Delete all read notifications
 */
export async function deleteReadNotifications(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return 0

  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)
    .not('read_at', 'is', null)
    .select('id')

  if (error) throw error
  return (data || []).length
}

/**
 * Create a notification (for system use)
 */
export async function createNotification(params: {
  userId: string
  type: NotificationType
  title: string
  message?: string
  projectId?: string
  deliverableId?: string
  blockerId?: string
  actorId?: string
}): Promise<Notification> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message || null,
      project_id: params.projectId || null,
      deliverable_id: params.deliverableId || null,
      blocker_id: params.blockerId || null,
      actor_id: params.actorId || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Notification
}

/**
 * Get notifications grouped by day
 */
export async function getNotificationsGroupedByDay(limit: number = 100): Promise<{
  today: Notification[]
  yesterday: Notification[]
  older: Notification[]
}> {
  const notifications = await getMyNotifications(limit)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  return {
    today: notifications.filter(n => new Date(n.created_at) >= today),
    yesterday: notifications.filter(n => {
      const date = new Date(n.created_at)
      return date >= yesterday && date < today
    }),
    older: notifications.filter(n => new Date(n.created_at) < yesterday),
  }
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'project_assigned':
      return 'folder'
    case 'blocker_acknowledged':
    case 'blocker_resolved':
      return 'alert-circle'
    case 'blocker_comment':
    case 'admin_comment':
      return 'message-circle'
    case 'mention':
      return 'at-sign'
    case 'deadline_reminder':
      return 'clock'
    case 'status_change':
      return 'refresh-cw'
    default:
      return 'bell'
  }
}

/**
 * Get notification color based on type
 */
export function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'project_assigned':
      return 'text-info'
    case 'blocker_acknowledged':
      return 'text-warning'
    case 'blocker_resolved':
      return 'text-success'
    case 'blocker_comment':
    case 'admin_comment':
      return 'text-info'
    case 'mention':
      return 'text-primary'
    case 'deadline_reminder':
      return 'text-error'
    case 'status_change':
      return 'text-muted-foreground'
    default:
      return 'text-muted-foreground'
  }
}

// Helper to normalize relations from Supabase array format
function normalizeNotificationRelations(notification: Record<string, unknown>): Notification {
  const actor = Array.isArray(notification.actor)
    ? notification.actor[0]
    : notification.actor
  const project = Array.isArray(notification.project)
    ? notification.project[0]
    : notification.project

  return {
    ...notification,
    actor,
    project,
  } as Notification
}

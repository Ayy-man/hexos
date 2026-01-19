import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/push/send-notification'

// Types
import {
  getNotificationColor,
  getNotificationIcon,
  type Notification,
  type NotificationType,
} from './notifications-utils' // Import from utils

// Exports
export type { Notification, NotificationType }
export { getNotificationColor, getNotificationIcon }

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
 * Also sends a push notification if the user has subscriptions
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

  // Also send push notification (fire and forget, don't block)
  sendPushNotification(params.userId, {
    title: params.title,
    body: params.message || '',
    url: params.projectId ? `/projects/${params.projectId}` : '/notifications',
    tag: params.type,
  }).catch((pushError) => {
    console.error('[createNotification] Push notification failed:', pushError)
  })

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
 * Get notifications that haven't been shown as toast popups yet
 * Used for initial page load to show recent unread notifications
 * that the user hasn't seen as a toast
 *
 * @param limit - Maximum number of notifications to return (default: 5)
 * @param minutesWindow - Only return notifications created within this many minutes (default: 5)
 */
export async function getUnshownToastNotifications(
  limit: number = 5,
  minutesWindow: number = 5
): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const cutoff = new Date(Date.now() - minutesWindow * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!actor_id(id, name),
      project:projects(id, project_name)
    `)
    .eq('user_id', user.id)
    .is('read_at', null)
    .is('shown_as_toast_at', null)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(normalizeNotificationRelations)
}

/**
 * Mark notifications as having been shown as toast popups
 * Fire-and-forget pattern - errors are logged but don't throw
 *
 * @param notificationIds - Array of notification IDs to mark as shown
 */
export async function markAsToastShown(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return

  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ shown_as_toast_at: new Date().toISOString() })
    .in('id', notificationIds)

  if (error) throw error
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

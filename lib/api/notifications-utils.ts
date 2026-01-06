// Client-safe notification utilities
// These can be imported in client components

export type NotificationType =
  | 'project_assigned'
  | 'blocker_acknowledged'
  | 'blocker_resolved'
  | 'blocker_comment'
  | 'admin_comment'
  | 'mention'
  | 'deadline_reminder'
  | 'status_change'

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

/**
 * Get the navigation URL for a notification
 */
export function getNotificationUrl(notification: Notification): string {
  const projectId = notification.project_id

  if (!projectId) {
    return '/dashboard'
  }

  switch (notification.type) {
    case 'project_assigned':
    case 'status_change':
      return `/projects/${projectId}`
    case 'blocker_acknowledged':
    case 'blocker_resolved':
    case 'blocker_comment':
      return `/projects/${projectId}?tab=requirements`
    case 'admin_comment':
    case 'mention':
      return `/projects/${projectId}?tab=activity`
    case 'deadline_reminder':
      return `/projects/${projectId}?tab=deliverables`
    default:
      return `/projects/${projectId}`
  }
}

/**
 * Format relative time for notifications
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

/**
 * Group notifications by time period
 */
export function groupNotificationsByTime(notifications: Notification[]): {
  today: Notification[]
  yesterday: Notification[]
  older: Notification[]
} {
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

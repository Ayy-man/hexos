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
  | 'stage_changed'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'payout_submitted'
  | 'payout_approved'
  | 'payout_paid'
  | 'payout_rejected'
  | 'scope_change_flagged'
  | 'scope_change_approved'
  | 'scope_change_rejected'
  | 'proposal_ready'
  | 'assigned'
  | 'requirement_unblocked'
  // Testing notifications
  | 'testing_ready_dev'
  | 'testing_ready_admin_int'
  | 'testing_ready_client'
  | 'testing_passed'
  | 'testing_failed'
  | 'testing_escalated'
  // Payment notifications
  | 'invoice_payment_failed'
  // Suggestion notifications
  | 'suggestion_reply'
  | 'suggestion_status_change'
  // Meeting notifications
  | 'meeting_ready'

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
  shown_as_toast_at: string | null
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
    case 'assigned':
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
    case 'stage_changed':
      return 'refresh-cw'
    case 'invoice_sent':
      return 'file-text'
    case 'invoice_paid':
      return 'check-circle'
    case 'invoice_payment_failed':
      return 'alert-triangle'
    case 'payout_submitted':
      return 'upload'
    case 'payout_approved':
      return 'check-circle'
    case 'payout_paid':
      return 'dollar-sign'
    case 'payout_rejected':
      return 'x-circle'
    case 'scope_change_flagged':
      return 'flag'
    case 'scope_change_approved':
      return 'check-circle'
    case 'scope_change_rejected':
      return 'x-circle'
    case 'proposal_ready':
      return 'file-check'
    case 'requirement_unblocked':
      return 'unlock'
    // Testing notifications
    case 'testing_ready_dev':
    case 'testing_ready_admin_int':
    case 'testing_ready_client':
      return 'play-circle'
    case 'testing_passed':
      return 'check-circle-2'
    case 'testing_failed':
      return 'x-circle'
    case 'testing_escalated':
      return 'zap'
    // Suggestion notifications
    case 'suggestion_reply':
      return 'message-circle'
    case 'suggestion_status_change':
      return 'lightbulb'
    // Meeting notifications
    case 'meeting_ready':
      return 'video'
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
    case 'assigned':
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
    case 'stage_changed':
      return 'text-muted-foreground'
    case 'invoice_sent':
      return 'text-info'
    case 'invoice_paid':
      return 'text-success'
    case 'invoice_payment_failed':
      return 'text-error'
    case 'payout_submitted':
      return 'text-info'
    case 'payout_approved':
      return 'text-success'
    case 'payout_paid':
      return 'text-success'
    case 'payout_rejected':
      return 'text-error'
    case 'scope_change_flagged':
      return 'text-warning'
    case 'scope_change_approved':
      return 'text-success'
    case 'scope_change_rejected':
      return 'text-error'
    case 'proposal_ready':
      return 'text-success'
    case 'requirement_unblocked':
      return 'text-info'
    // Testing notifications
    case 'testing_ready_dev':
    case 'testing_ready_admin_int':
    case 'testing_ready_client':
      return 'text-primary'
    case 'testing_passed':
      return 'text-success'
    case 'testing_failed':
      return 'text-error'
    case 'testing_escalated':
      return 'text-warning'
    // Suggestion notifications
    case 'suggestion_reply':
      return 'text-info'
    case 'suggestion_status_change':
      return 'text-warning'
    // Meeting notifications
    case 'meeting_ready':
      return 'text-info'
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
    // Some notification types don't have a project
    switch (notification.type) {
      case 'proposal_ready':
      case 'stage_changed':
      case 'assigned':
        return '/inquiries'
      case 'suggestion_reply':
      case 'suggestion_status_change':
        return '/my-suggestions'
      case 'meeting_ready':
        return '/meetings'
      default:
        return '/dashboard'
    }
  }

  switch (notification.type) {
    case 'project_assigned':
    case 'status_change':
      return `/projects/${projectId}`
    case 'blocker_acknowledged':
    case 'blocker_resolved':
    case 'blocker_comment':
    case 'requirement_unblocked':
      return `/projects/${projectId}?tab=requirements`
    case 'admin_comment':
    case 'mention':
      return `/projects/${projectId}?tab=activity`
    case 'deadline_reminder':
      return `/projects/${projectId}?tab=deliverables`
    case 'invoice_sent':
    case 'invoice_paid':
    case 'invoice_payment_failed':
      return `/projects/${projectId}?tab=financials`
    case 'payout_submitted':
    case 'payout_approved':
    case 'payout_paid':
    case 'payout_rejected':
      return `/finances/payouts`
    case 'scope_change_flagged':
    case 'scope_change_approved':
    case 'scope_change_rejected':
      return `/projects/${projectId}?tab=scope`
    // Testing notifications
    case 'testing_ready_dev':
    case 'testing_ready_admin_int':
    case 'testing_ready_client':
    case 'testing_passed':
    case 'testing_failed':
    case 'testing_escalated':
      return `/projects/${projectId}?tab=testing`
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

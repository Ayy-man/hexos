'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Folder,
  AlertCircle,
  MessageCircle,
  AtSign,
  Clock,
  RefreshCw,
  Bell,
} from 'lucide-react'
import { RoleAvatar } from '@/components/ui/role-avatar'
import type { UserRole } from '@/lib/auth/types'
import {
  type Notification,
  getNotificationColor,
  getNotificationUrl,
  formatRelativeTime,
} from '@/lib/api/notifications-utils'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead?: (id: string) => void
  onClose?: () => void
}

function getIcon(type: Notification['type']) {
  switch (type) {
    case 'project_assigned':
      return Folder
    case 'blocker_acknowledged':
    case 'blocker_resolved':
      return AlertCircle
    case 'blocker_comment':
    case 'admin_comment':
      return MessageCircle
    case 'mention':
      return AtSign
    case 'deadline_reminder':
      return Clock
    case 'status_change':
      return RefreshCw
    default:
      return Bell
  }
}

function getActionText(type: Notification['type']): string {
  switch (type) {
    case 'project_assigned':
      return 'assigned you to'
    case 'blocker_acknowledged':
      return 'acknowledged blocker in'
    case 'blocker_resolved':
      return 'resolved blocker in'
    case 'blocker_comment':
    case 'admin_comment':
      return 'commented in'
    case 'mention':
      return 'mentioned you in'
    case 'deadline_reminder':
      return 'deadline approaching for'
    case 'status_change':
      return 'updated status of'
    default:
      return 'notified you about'
  }
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  if (isToday) {
    return `Today ${timeStr}`
  } else if (isYesterday) {
    return `Yesterday ${timeStr}`
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
}

export const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationItemProps) {
  const router = useRouter()
  const Icon = getIcon(notification.type)
  const colorClass = getNotificationColor(notification.type)
  const isUnread = !notification.read_at
  const actionText = getActionText(notification.type)

  const actorName = notification.actor?.name || 'System'
  const actorInitial = actorName.charAt(0).toUpperCase()

  const handleClick = () => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }
    const url = getNotificationUrl(notification)
    router.push(url)
    onClose?.()
  }

  return (
    <button
      onClick={handleClick}
      className="w-full py-4 first:pt-0 last:pb-0 text-left group"
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <RoleAvatar
          role={(notification.actor?.role as UserRole) || 'admin'}
          name={actorName}
          avatarUrl={notification.actor?.avatar_url}
          size="lg"
        />

        {/* Content */}
        <div className="flex flex-1 flex-col space-y-2 min-w-0">
          <div className="w-full">
            {/* Header with action text */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-medium">{actorName}</span>
                <span className="text-muted-foreground"> {actionText} </span>
                {notification.project && (
                  <span className="font-medium">{notification.project.project_name}</span>
                )}
              </div>
              {isUnread && (
                <div className="size-1.5 rounded-full bg-success shrink-0" />
              )}
            </div>

            {/* Timestamp row */}
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <div className="text-xs text-muted-foreground">
                {formatTimestamp(notification.created_at)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatRelativeTime(notification.created_at)}
              </div>
            </div>
          </div>

          {/* Message content */}
          {notification.message && (
            <div className="rounded-lg bg-muted/60 p-2.5 text-sm text-muted-foreground tracking-tight line-clamp-2">
              {notification.message}
            </div>
          )}

          {/* Type indicator with icon */}
          <div className={cn('flex items-center gap-1.5 text-xs', colorClass)}>
            <Icon className="size-3.5" />
            <span className="capitalize">{notification.type.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>
    </button>
  )
})

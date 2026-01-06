'use client'

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

const iconMap = {
  'folder': Folder,
  'alert-circle': AlertCircle,
  'message-circle': MessageCircle,
  'at-sign': AtSign,
  'clock': Clock,
  'refresh-cw': RefreshCw,
  'bell': Bell,
} as const

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

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationItemProps) {
  const router = useRouter()
  const Icon = getIcon(notification.type)
  const colorClass = getNotificationColor(notification.type)
  const isUnread = !notification.read_at

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
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left rounded-lg transition-colors',
        'hover:bg-accent/50',
        isUnread && 'bg-accent/30'
      )}
    >
      {/* Icon */}
      <div className={cn('mt-0.5 shrink-0', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm leading-tight', isUnread && 'font-medium')}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="shrink-0 h-2 w-2 rounded-full bg-cyan-500 mt-1.5" />
          )}
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatRelativeTime(notification.created_at)}</span>
          {notification.project && (
            <>
              <span>·</span>
              <span className="truncate">{notification.project.project_name}</span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}

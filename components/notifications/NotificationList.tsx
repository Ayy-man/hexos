'use client'

import { Bell } from 'lucide-react'
import { NotificationItem } from './NotificationItem'
import {
  type Notification,
  groupNotificationsByTime,
} from '@/lib/api/notifications-utils'

interface NotificationListProps {
  notifications: Notification[]
  onMarkAsRead?: (id: string) => void
  onClose?: () => void
  loading?: boolean
}

function NotificationGroup({
  title,
  notifications,
  onMarkAsRead,
  onClose,
}: {
  title: string
  notifications: Notification[]
  onMarkAsRead?: (id: string) => void
  onClose?: () => void
}) {
  if (notifications.length === 0) return null

  return (
    <div className="space-y-1">
      <h3 className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      <div>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="h-4 w-4 rounded bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">All caught up!</p>
      <p className="text-xs text-muted-foreground mt-1">
        No new notifications
      </p>
    </div>
  )
}

export function NotificationList({
  notifications,
  onMarkAsRead,
  onClose,
  loading = false,
}: NotificationListProps) {
  if (loading) {
    return <LoadingSkeleton />
  }

  if (notifications.length === 0) {
    return <EmptyState />
  }

  const grouped = groupNotificationsByTime(notifications)

  return (
    <div className="space-y-4 py-2">
      <NotificationGroup
        title="Today"
        notifications={grouped.today}
        onMarkAsRead={onMarkAsRead}
        onClose={onClose}
      />
      <NotificationGroup
        title="Yesterday"
        notifications={grouped.yesterday}
        onMarkAsRead={onMarkAsRead}
        onClose={onClose}
      />
      <NotificationGroup
        title="Earlier"
        notifications={grouped.older}
        onMarkAsRead={onMarkAsRead}
        onClose={onClose}
      />
    </div>
  )
}

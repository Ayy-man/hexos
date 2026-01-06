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
      <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="divide-y divide-dashed divide-border">
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
    <div className="divide-y divide-dashed divide-border">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 py-4 animate-pulse">
          <div className="size-11 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-10 w-full rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center space-y-2.5 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <Bell className="size-6 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-medium tracking-tight">No notifications yet</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          We&apos;ll notify you when something happens
        </p>
      </div>
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
    <div className="space-y-6 py-2">
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

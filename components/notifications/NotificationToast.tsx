'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import {
  Folder,
  AlertCircle,
  MessageCircle,
  AtSign,
  Clock,
  RefreshCw,
  Bell,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  type Notification,
  getNotificationColor,
  getNotificationUrl,
} from '@/lib/api/notifications-utils'

interface NotificationToastProps {
  notification: Notification
  index: number
  onDismiss: () => void
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

export function NotificationToast({
  notification,
  index,
  onDismiss,
}: NotificationToastProps) {
  const router = useRouter()
  const Icon = getIcon(notification.type)
  const colorClass = getNotificationColor(notification.type)

  // Staggered timing: 3s, 4s, 5s, 6s, 7s
  const duration = 3000 + (index * 1000)

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  const handleClick = useCallback(() => {
    const url = getNotificationUrl(notification)
    router.push(url)
    onDismiss()
  }, [notification, router, onDismiss])

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDismiss()
  }, [onDismiss])

  return (
    <div
      className="animate-slide-in-right cursor-pointer"
      onClick={handleClick}
    >
      <Card className="w-80 shadow-lg border-border/50 bg-background/95 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={colorClass}>
              <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight">
                {notification.title}
              </p>
              {notification.message && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {notification.message}
                </p>
              )}
              {notification.project && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {notification.project.project_name}
                </p>
              )}
            </div>

            {/* Dismiss button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 -mr-1 -mt-1"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 animate-shrink-width rounded-full"
              style={{ animationDuration: `${duration}ms` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

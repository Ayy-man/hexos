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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

export function NotificationToast({
  notification,
  index,
  onDismiss,
}: NotificationToastProps) {
  const router = useRouter()
  const Icon = getIcon(notification.type)
  const colorClass = getNotificationColor(notification.type)
  const actionText = getActionText(notification.type)

  // Staggered timing: 4s, 5s, 6s, 7s, 8s
  const duration = 4000 + (index * 1000)

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

  const actorName = notification.actor?.name || 'System'
  const actorInitial = actorName.charAt(0).toUpperCase()

  return (
    <div
      className="animate-slide-in-right cursor-pointer group"
      onClick={handleClick}
    >
      <div className="w-[340px] rounded-xl border border-white/10 bg-background/80 backdrop-blur-xl shadow-2xl shadow-black/20 dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/5 overflow-hidden transition-all hover:bg-background/90 hover:scale-[1.02]">
        <div className="p-4">
          <div className="flex gap-3">
            {/* Avatar with icon overlay */}
            <div className="relative">
              <Avatar className="size-10 ring-2 ring-background">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${actorName}`}
                  alt={actorName}
                />
                <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                  {actorInitial}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-0.5 -right-0.5 p-1 rounded-full bg-background ring-2 ring-background ${colorClass}`}>
                <Icon className="size-3" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm">
                  <span className="font-semibold text-foreground">{actorName}</span>
                  <span className="text-muted-foreground"> {actionText} </span>
                  {notification.project && (
                    <span className="font-medium text-foreground">{notification.project.project_name}</span>
                  )}
                </div>
                {/* Unread indicator */}
                <div className="size-2 rounded-full bg-emerald-500 shrink-0 mt-1.5 animate-pulse" />
              </div>

              {/* Message preview */}
              {notification.message && (
                <div className="rounded-lg bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground line-clamp-2">
                  {notification.message}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-[11px] text-muted-foreground/70">
                Just now
              </div>
            </div>

            {/* Dismiss button */}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 -mr-1 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDismiss}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-muted/30">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 animate-shrink-width rounded-full"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  )
}

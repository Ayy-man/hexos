'use client'

import { useEffect, useCallback, useState } from 'react'
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
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { RoleAvatar } from '@/components/ui/role-avatar'
import type { UserRole } from '@/lib/auth/types'
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
  const [isDragging, setIsDragging] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Motion values for drag
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-50, 0, 150], [0.8, 1, 0])

  // Staggered timing: 5s, 6s, 7s, 8s, 9s
  const duration = 5000 + (index * 1000)

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(onDismiss, 200)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  const handleClick = useCallback(() => {
    // Don't navigate if we were dragging
    if (isDragging || isExiting) return
    const url = getNotificationUrl(notification)
    router.push(url)
    setIsExiting(true)
    setTimeout(onDismiss, 200)
  }, [notification, router, onDismiss, isDragging, isExiting])

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExiting(true)
    setTimeout(onDismiss, 200)
  }, [onDismiss])

  // Handle drag end - dismiss if dragged far enough
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 80
      const velocity = info.velocity.x
      const offset = info.offset.x

      // Dismiss if dragged right past threshold or with enough velocity
      if (offset > threshold || velocity > 400) {
        setIsExiting(true)
        // Animate out then remove
        setTimeout(onDismiss, 150)
      } else {
        setTimeout(() => setIsDragging(false), 100)
      }
    },
    [onDismiss]
  )

  const actorName = notification.actor?.name || 'System'
  const actorInitial = actorName.charAt(0).toUpperCase()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={isExiting
        ? { opacity: 0, x: 300, scale: 0.95 }
        : { opacity: 1, x: 0, scale: 1 }
      }
      exit={{ opacity: 0, x: 300, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 35,
        opacity: { duration: 0.15 }
      }}
      style={isExiting ? undefined : { x, opacity }}
      drag={isExiting ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.3, right: 0.8 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
      className="cursor-grab group touch-pan-y select-none"
      onClick={handleClick}
    >
      <div className="w-[340px] rounded-xl border border-white/10 bg-background/80 backdrop-blur-xl shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden transition-[background-color,transform] hover:bg-background/90 hover:scale-[1.02]">
        <div className="p-4">
          <div className="flex gap-3">
            {/* Avatar with icon overlay */}
            <div className="relative">
              <RoleAvatar
                role={(notification.actor?.role as UserRole) || 'admin'}
                name={actorName}
                avatarUrl={notification.actor?.avatar_url}
              />
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
                <div className="size-2 rounded-full bg-success shrink-0 mt-1.5 animate-pulse" />
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
            className="h-full bg-primary rounded-full origin-left"
            style={{
              animation: `shrink-width ${duration}ms linear forwards`
            }}
          />
        </div>
      </div>
    </motion.div>
  )
}

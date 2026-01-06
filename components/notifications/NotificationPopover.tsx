'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Bell, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NotificationList } from './NotificationList'
import { type Notification } from '@/lib/api/notifications-utils'
import {
  fetchNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/features/notifications/actions/notificationActions'

interface NotificationPopoverProps {
  initialNotifications?: Notification[]
  initialUnreadCount?: number
}

export function NotificationPopover({
  initialNotifications = [],
  initialUnreadCount = 0,
}: NotificationPopoverProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [loading, setLoading] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousUnreadCount = useRef(initialUnreadCount)

  // Initialize audio on mount
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.wav')
    audioRef.current.volume = 0.5
  }, [])

  // Fetch notifications when popover opens
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const result = await fetchNotificationsAction(50)
    if (result.success) {
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await fetchNotificationsAction(50)
      if (result.success) {
        // Play sound if new notifications arrived
        if (result.unreadCount > previousUnreadCount.current && audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {
            // Ignore autoplay errors (browser policy)
          })
        }
        previousUnreadCount.current = result.unreadCount
        setUnreadCount(result.unreadCount)
        // Only update full list if popover is open
        if (open) {
          setNotifications(result.notifications)
        }
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [open])

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    await markNotificationReadAction(id)
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true)
    const result = await markAllNotificationsReadAction()
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
      setUnreadCount(0)
    }
    setMarkingAllRead(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead}
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          <NotificationList
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onClose={() => setOpen(false)}
            loading={loading}
          />
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}

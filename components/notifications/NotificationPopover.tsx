'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotificationList } from './NotificationList'
import { NotificationToast } from './NotificationToast'
import { type Notification } from '@/lib/api/notifications-utils'
import { useNotificationsRealtime } from '@/hooks/use-notifications-realtime'

interface NotificationPopoverProps {
  userId: string
  initialNotifications?: Notification[]
  initialUnreadCount?: number
}

export function NotificationPopover({
  userId,
  initialNotifications = [],
  initialUnreadCount = 0,
}: NotificationPopoverProps) {
  const [open, setOpen] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  const {
    notifications,
    unreadCount,
    isLoading,
    toastQueue,
    refetch,
    markAsRead,
    markAllAsRead,
    dismissToast,
  } = useNotificationsRealtime({
    userId,
    initialNotifications,
    initialUnreadCount,
  })

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true)
    await markAllAsRead()
    setMarkingAllRead(false)
  }

  // Refetch when popover opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      refetch()
    }
  }

  // Filter notifications based on selected tab
  const filteredNotifications = tab === 'unread'
    ? notifications.filter(n => !n.read_at)
    : notifications

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-medium text-white animate-in zoom-in">
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
              loading={isLoading}
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

      {/* Toast notification stack */}
      {toastQueue.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          {toastQueue.map((notification, index) => (
            <NotificationToast
              key={notification.id}
              notification={notification}
              index={index}
              onDismiss={() => dismissToast(notification.id)}
            />
          ))}
        </div>
      )}
    </>
  )
}

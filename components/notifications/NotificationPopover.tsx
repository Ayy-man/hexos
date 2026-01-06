'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, Settings, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-medium text-white animate-in zoom-in">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[420px] p-0 rounded-xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl"
          sideOffset={8}
        >
          {/* Header */}
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold tracking-tight">
                Your notifications
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={handleMarkAllAsRead}
                        disabled={markingAllRead}
                      >
                        <CheckCheck className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark all as read</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link href="/settings" onClick={() => setOpen(false)}>
                        <Settings className="size-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notification settings</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'unread')} className="w-full">
              <TabsList className="w-full h-9 p-1 bg-muted/50">
                <TabsTrigger value="all" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-background">
                  View all
                  <Badge variant="secondary" className="size-5 rounded-full p-0 justify-center text-[10px] bg-muted-foreground/20">
                    {notifications.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="unread" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-background">
                  Unread
                  <Badge variant="secondary" className="size-5 rounded-full p-0 justify-center text-[10px] bg-muted-foreground/20">
                    {unreadCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Notification List */}
          <ScrollArea className="h-[420px]">
            <div className="px-4">
              <NotificationList
                notifications={filteredNotifications}
                onMarkAsRead={handleMarkAsRead}
                onClose={() => setOpen(false)}
                loading={isLoading}
              />
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border/50 p-3">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
            >
              View all notifications
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {/* Toast notification stack */}
      {toastQueue.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
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

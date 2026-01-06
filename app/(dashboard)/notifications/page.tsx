import { getMyNotifications, getUnreadCount } from '@/lib/api/notifications'
import { NotificationsPageClient } from './NotificationsPageClient'

export const metadata = {
  title: 'Notifications | hexOS',
}

export default async function NotificationsPage() {
  const [notifications, unreadCount] = await Promise.all([
    getMyNotifications(100).catch(() => []),
    getUnreadCount().catch(() => 0),
  ])

  return (
    <NotificationsPageClient
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  )
}

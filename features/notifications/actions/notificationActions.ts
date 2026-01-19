'use server'

import { revalidatePath } from 'next/cache'
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/lib/api/notifications'

export async function fetchNotificationsAction(limit: number = 50) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      getMyNotifications(limit),
      getUnreadCount(),
    ])
    return { success: true, notifications, unreadCount }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return { success: false, notifications: [], unreadCount: 0 }
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    await markAsRead(notificationId)
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return { success: false }
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const count = await markAllAsRead()
    revalidatePath('/', 'layout')
    return { success: true, count }
  } catch (error) {
    console.error('Error marking all as read:', error)
    return { success: false }
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import {
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
} from '@/lib/api/notifications'

export async function markNotificationReadAction(notificationId: string) {
  try {
    const notification = await markAsRead(notificationId)
    revalidatePath('/dashboard/dev')
    return { success: true, notification }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return { success: false, message: 'Failed to mark as read' }
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const count = await markAllAsRead()
    revalidatePath('/dashboard/dev')
    return { success: true, count }
  } catch (error) {
    console.error('Error marking all as read:', error)
    return { success: false, message: 'Failed to mark all as read' }
  }
}

export async function deleteNotificationAction(notificationId: string) {
  try {
    await deleteNotification(notificationId)
    revalidatePath('/dashboard/dev')
    return { success: true }
  } catch (error) {
    console.error('Error deleting notification:', error)
    return { success: false, message: 'Failed to delete notification' }
  }
}

export async function clearReadNotificationsAction() {
  try {
    const count = await deleteReadNotifications()
    revalidatePath('/dashboard/dev')
    return { success: true, count }
  } catch (error) {
    console.error('Error clearing read notifications:', error)
    return { success: false, message: 'Failed to clear notifications' }
  }
}

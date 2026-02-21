/**
 * Server-side Push Notification Sender
 *
 * Usage:
 * await sendPushNotification(userId, {
 *   title: 'New Message',
 *   body: 'You have a new message from John',
 *   url: '/conversations/abc123'
 * });
 */

import webpush from 'web-push';
import { createClient as createAdminClient } from '@/lib/supabase/admin';

// Configure VAPID details
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:team@hexona.dev',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Send push notification to a user
 */
export async function sendPushNotification(
  userId: string,
  notification: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    const supabase = createAdminClient();

    // Get all push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch push subscriptions:', error);
      return { sent: 0, failed: 0 };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    // Prepare payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: notification.badge || '/icon-72x72.png',
      data: {
        url: notification.url || '/',
        dateOfArrival: Date.now(),
      },
      tag: notification.tag || 'default',
      requireInteraction: notification.requireInteraction || false,
      actions: notification.actions || [],
    });

    let sent = 0;
    let failed = 0;

    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload
        );

        // Update last_used_at
        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id);

        sent++;
      } catch (error: any) {
        console.error(`Failed to send push to subscription ${sub.id}:`, error);
        failed++;

        // If subscription is invalid (410 Gone), remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Removing invalid subscription ${sub.id}`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }
      }
    }

    console.log(`Push notification sent: ${sent} succeeded, ${failed} failed`);
    return { sent, failed };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  notification: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendPushNotification(userId, notification);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { sent: totalSent, failed: totalFailed };
}

/**
 * Generate VAPID keys (run once during setup)
 *
 * Usage:
 * const keys = generateVAPIDKeys();
 * console.log('Public Key:', keys.publicKey);
 * console.log('Private Key:', keys.privateKey);
 */
export function generateVAPIDKeys() {
  return webpush.generateVAPIDKeys();
}

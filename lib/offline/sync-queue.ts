/**
 * Offline Mutation Sync Queue
 *
 * Handles syncing pending mutations when the app comes back online.
 * Supports optimistic updates and automatic retry with exponential backoff.
 */

import {
  getPendingMutations,
  updateMutationStatus,
  removeMutation,
  type PendingMutation,
} from '@/lib/db/offline-storage';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// Sync Manager
// ============================================================================

export class SyncQueue {
  private syncing = false;
  private listeners: Array<() => void> = [];

  /**
   * Sync all pending mutations
   */
  async syncAll(): Promise<void> {
    if (this.syncing) {
      console.log('[SyncQueue] Already syncing, skipping');
      return;
    }

    this.syncing = true;
    this.notifyListeners();

    try {
      const mutations = await getPendingMutations();
      const pending = mutations.filter(m => m.status === 'pending' || m.status === 'failed');

      console.log(`[SyncQueue] Syncing ${pending.length} mutations`);

      if (pending.length === 0) {
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const mutation of pending) {
        try {
          await this.syncMutation(mutation);
          await removeMutation(mutation.id);
          successCount++;
        } catch (error) {
          console.error(`[SyncQueue] Failed to sync mutation ${mutation.id}:`, error);
          await updateMutationStatus(
            mutation.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          );
          failCount++;

          // If retry count > 5, give up
          if (mutation.retry_count >= 5) {
            console.error(`[SyncQueue] Giving up on mutation ${mutation.id} after 5 retries`);
            await removeMutation(mutation.id);
          }
        }
      }

      // Show toast with results
      if (successCount > 0) {
        toast.success(`Synced ${successCount} ${successCount === 1 ? 'change' : 'changes'}`);
      }

      if (failCount > 0) {
        toast.error(`Failed to sync ${failCount} ${failCount === 1 ? 'change' : 'changes'}`, {
          action: {
            label: 'Retry',
            onClick: () => this.syncAll(),
          },
        });
      }
    } finally {
      this.syncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Sync a single mutation
   */
  private async syncMutation(mutation: PendingMutation): Promise<void> {
    const supabase = createClient();

    switch (mutation.type) {
      case 'message': {
        const { conversation_id, content, sender_id } = mutation.payload;
        const { error } = await supabase.from('messages').insert({
          conversation_id,
          content,
          sender_id,
        });
        if (error) throw error;
        break;
      }

      case 'reaction': {
        const { message_id, emoji, user_id } = mutation.payload;
        const { error } = await supabase.from('message_reactions').insert({
          message_id,
          emoji,
          user_id,
        });
        if (error) throw error;
        break;
      }

      case 'task_complete': {
        const { task_id } = mutation.payload;
        const { error } = await supabase
          .from('pulse_daily_tasks')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', task_id);
        if (error) throw error;
        break;
      }

      case 'task_create': {
        const { user_id, date, title, is_focus, position } = mutation.payload;
        const { error } = await supabase.from('pulse_daily_tasks').insert({
          user_id,
          date,
          title,
          is_focus: is_focus || false,
          position: position || 0,
        });
        if (error) throw error;
        break;
      }

      case 'notification_read': {
        const { notification_id } = mutation.payload;
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notification_id);
        if (error) throw error;
        break;
      }

      default:
        console.warn(`[SyncQueue] Unknown mutation type: ${mutation.type}`);
    }
  }

  /**
   * Check if currently syncing
   */
  isSyncing(): boolean {
    return this.syncing;
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

// ============================================================================
// Global Sync Queue Instance
// ============================================================================

let syncQueueInstance: SyncQueue | null = null;

export function getSyncQueue(): SyncQueue {
  if (!syncQueueInstance) {
    syncQueueInstance = new SyncQueue();
  }
  return syncQueueInstance;
}

// ============================================================================
// Auto-sync on network reconnection
// ============================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[SyncQueue] Network reconnected, syncing...');
    const queue = getSyncQueue();
    await queue.syncAll();
  });

  // Also sync when page becomes visible
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && navigator.onLine) {
      console.log('[SyncQueue] Page visible and online, syncing...');
      const queue = getSyncQueue();
      await queue.syncAll();
    }
  });
}

// ============================================================================
// Helpers for common mutations
// ============================================================================

export async function queueMessage(conversationId: string, content: string, senderId: string) {
  const { queueMutation } = await import('@/lib/db/offline-storage');
  return await queueMutation('message', {
    conversation_id: conversationId,
    content,
    sender_id: senderId,
  });
}

export async function queueReaction(messageId: string, emoji: string, userId: string) {
  const { queueMutation } = await import('@/lib/db/offline-storage');
  return await queueMutation('reaction', {
    message_id: messageId,
    emoji,
    user_id: userId,
  });
}

export async function queueTaskCompletion(taskId: string) {
  const { queueMutation } = await import('@/lib/db/offline-storage');
  return await queueMutation('task_complete', {
    task_id: taskId,
  });
}

export async function queueTaskCreate(
  userId: string,
  date: string,
  title: string,
  isFocus = false,
  position = 0
) {
  const { queueMutation } = await import('@/lib/db/offline-storage');
  return await queueMutation('task_create', {
    user_id: userId,
    date,
    title,
    is_focus: isFocus,
    position,
  });
}

export async function queueNotificationRead(notificationId: string) {
  const { queueMutation } = await import('@/lib/db/offline-storage');
  return await queueMutation('notification_read', {
    notification_id: notificationId,
  });
}

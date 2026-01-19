/**
 * IndexedDB Offline Storage Layer
 *
 * Provides client-side caching and offline mutation queue for PWA support.
 * All data stored here is a copy of server data for offline access.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Project } from '@/lib/api/projects';
import type { Conversation, Message } from '@/lib/api/conversations.shared';

// ============================================================================
// Database Schema
// ============================================================================

const DB_NAME = 'hexos-offline';
const DB_VERSION = 1;

export interface CachedProject {
  id: string;
  data: Project;
  last_synced: number; // timestamp
  last_viewed: number; // timestamp
}

export interface CachedConversation {
  id: string;
  conversation: Conversation;
  messages: Message[]; // Last 50 messages
  last_message_id: string | null;
  last_synced: number;
  has_more: boolean; // True if there are older messages not cached
}

export interface CachedPulseData {
  user_id: string;
  tasks_by_date: Record<string, unknown[]>; // ISO date string -> tasks
  events: unknown[]; // Last 30 days
  stats: unknown;
  heatmap_data: Record<string, number>; // date -> points
  last_synced: number;
}

export interface CachedNotification {
  id: string;
  data: any; // Notification type from API
  read_locally: boolean; // Track read status offline
  synced: boolean; // False if read status needs sync
  created_at: number;
}

export interface PendingMutation {
  id: string; // UUID
  type: 'message' | 'reaction' | 'task_complete' | 'task_create' | 'notification_read';
  payload: any;
  created_at: number;
  retry_count: number;
  status: 'pending' | 'sending' | 'failed';
  error_message?: string;
}

export interface CachedFile {
  url: string;
  blob: Blob;
  mime_type: string;
  cached_at: number;
  size: number;
}

// ============================================================================
// Database Connection
// ============================================================================

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('last_viewed', 'last_viewed');
          projectStore.createIndex('last_synced', 'last_synced');
        }

        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('last_synced', 'last_synced');
        }

        // Pulse data store (one entry per user)
        if (!db.objectStoreNames.contains('pulse')) {
          db.createObjectStore('pulse', { keyPath: 'user_id' });
        }

        // Notifications store
        if (!db.objectStoreNames.contains('notifications')) {
          const notifStore = db.createObjectStore('notifications', { keyPath: 'id' });
          notifStore.createIndex('created_at', 'created_at');
          notifStore.createIndex('synced', 'synced');
        }

        // Pending mutations queue
        if (!db.objectStoreNames.contains('pending_mutations')) {
          const mutationStore = db.createObjectStore('pending_mutations', { keyPath: 'id' });
          mutationStore.createIndex('created_at', 'created_at');
          mutationStore.createIndex('status', 'status');
          mutationStore.createIndex('type', 'type');
        }

        // Cached files (images, thumbnails)
        if (!db.objectStoreNames.contains('cached_files')) {
          const fileStore = db.createObjectStore('cached_files', { keyPath: 'url' });
          fileStore.createIndex('cached_at', 'cached_at');
          fileStore.createIndex('size', 'size');
        }

        // User settings/metadata
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// ============================================================================
// Projects Cache
// ============================================================================

export async function cacheProject(project: Project) {
  const db = await getDB();
  const cached: CachedProject = {
    id: project.id,
    data: project,
    last_synced: Date.now(),
    last_viewed: Date.now(),
  };
  await db.put('projects', cached);
}

export async function getCachedProject(id: string): Promise<CachedProject | null> {
  const db = await getDB();
  const cached = await db.get('projects', id);

  if (cached) {
    // Update last_viewed timestamp
    cached.last_viewed = Date.now();
    await db.put('projects', cached);
  }

  return cached || null;
}

export async function getCachedProjects(limit = 10): Promise<CachedProject[]> {
  const db = await getDB();
  const index = db.transaction('projects').store.index('last_viewed');
  const projects = await index.getAll();
  return projects.sort((a, b) => b.last_viewed - a.last_viewed).slice(0, limit);
}

export async function clearOldProjects(keepCount = 20) {
  const db = await getDB();
  const projects = await getCachedProjects(100);

  if (projects.length > keepCount) {
    const tx = db.transaction('projects', 'readwrite');
    for (const project of projects.slice(keepCount)) {
      await tx.store.delete(project.id);
    }
    await tx.done;
  }
}

// ============================================================================
// Conversations Cache
// ============================================================================

export async function cacheConversation(
  conversation: Conversation,
  messages: Message[],
  hasMore = false
) {
  const db = await getDB();
  const cached: CachedConversation = {
    id: conversation.id,
    conversation,
    messages: messages.slice(-50), // Keep last 50 messages
    last_message_id: messages.length > 0 ? messages[messages.length - 1].id : null,
    last_synced: Date.now(),
    has_more: hasMore,
  };
  await db.put('conversations', cached);
}

export async function getCachedConversation(id: string): Promise<CachedConversation | null> {
  const db = await getDB();
  return (await db.get('conversations', id)) || null;
}

export async function getCachedConversations(): Promise<CachedConversation[]> {
  const db = await getDB();
  return await db.getAll('conversations');
}

export async function addMessageToCache(conversationId: string, message: Message) {
  const cached = await getCachedConversation(conversationId);
  if (!cached) return;

  cached.messages.push(message);
  cached.messages = cached.messages.slice(-50); // Keep last 50
  cached.last_message_id = message.id;
  cached.last_synced = Date.now();

  const db = await getDB();
  await db.put('conversations', cached);
}

// ============================================================================
// Pulse Data Cache
// ============================================================================

export async function cachePulseData(
  userId: string,
  tasksByDate: Record<string, unknown[]>,
  events: unknown[],
  stats: unknown,
  heatmapData: Record<string, number>
) {
  const db = await getDB();
  const cached: CachedPulseData = {
    user_id: userId,
    tasks_by_date: tasksByDate,
    events: events.slice(-100), // Last 100 events
    stats,
    heatmap_data: heatmapData,
    last_synced: Date.now(),
  };
  await db.put('pulse', cached);
}

export async function getCachedPulseData(userId: string): Promise<CachedPulseData | null> {
  const db = await getDB();
  return (await db.get('pulse', userId)) || null;
}

// ============================================================================
// Notifications Cache
// ============================================================================

export async function cacheNotification(notification: any) {
  const db = await getDB();
  const cached: CachedNotification = {
    id: notification.id,
    data: notification,
    read_locally: notification.read || false,
    synced: true,
    created_at: Date.now(),
  };
  await db.put('notifications', cached);
}

export async function getCachedNotifications(limit = 50): Promise<CachedNotification[]> {
  const db = await getDB();
  const index = db.transaction('notifications').store.index('created_at');
  const notifications = await index.getAll();
  return notifications.sort((a, b) => b.created_at - a.created_at).slice(0, limit);
}

export async function markNotificationReadLocally(id: string) {
  const db = await getDB();
  const notification = await db.get('notifications', id);
  if (notification) {
    notification.read_locally = true;
    notification.synced = false; // Needs sync
    await db.put('notifications', notification);
  }
}

export async function getUnsyncedNotifications(): Promise<CachedNotification[]> {
  const db = await getDB();
  const index = db.transaction('notifications').store.index('synced');
  const notifications = await index.getAll(IDBKeyRange.only(false));
  return notifications;
}

// ============================================================================
// Pending Mutations Queue
// ============================================================================

export async function queueMutation(
  type: PendingMutation['type'],
  payload: any
): Promise<string> {
  const db = await getDB();
  const mutation: PendingMutation = {
    id: crypto.randomUUID(),
    type,
    payload,
    created_at: Date.now(),
    retry_count: 0,
    status: 'pending',
  };
  await db.add('pending_mutations', mutation);
  return mutation.id;
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await getDB();
  const index = db.transaction('pending_mutations').store.index('created_at');
  return await index.getAll();
}

export async function updateMutationStatus(
  id: string,
  status: PendingMutation['status'],
  errorMessage?: string
) {
  const db = await getDB();
  const mutation = await db.get('pending_mutations', id);
  if (mutation) {
    mutation.status = status;
    if (status === 'failed') {
      mutation.retry_count++;
      mutation.error_message = errorMessage;
    }
    await db.put('pending_mutations', mutation);
  }
}

export async function removeMutation(id: string) {
  const db = await getDB();
  await db.delete('pending_mutations', id);
}

export async function clearCompletedMutations() {
  const db = await getDB();
  const mutations = await getPendingMutations();
  const tx = db.transaction('pending_mutations', 'readwrite');
  for (const mutation of mutations) {
    if (mutation.status === 'failed' && mutation.retry_count > 5) {
      await tx.store.delete(mutation.id);
    }
  }
  await tx.done;
}

// ============================================================================
// File Cache (for small images/thumbnails)
// ============================================================================

export async function cacheFile(url: string, blob: Blob) {
  // Only cache files < 1MB
  if (blob.size > 1_000_000) return;

  const db = await getDB();
  const cached: CachedFile = {
    url,
    blob,
    mime_type: blob.type,
    cached_at: Date.now(),
    size: blob.size,
  };
  await db.put('cached_files', cached);

  // Cleanup old files if total size > 10MB
  await cleanupFileCache();
}

export async function getCachedFile(url: string): Promise<Blob | null> {
  const db = await getDB();
  const cached = await db.get('cached_files', url);
  return cached?.blob || null;
}

async function cleanupFileCache() {
  const db = await getDB();
  const files = await db.getAll('cached_files');
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // If total size > 10MB, remove oldest files
  if (totalSize > 10_000_000) {
    files.sort((a, b) => a.cached_at - b.cached_at);
    const tx = db.transaction('cached_files', 'readwrite');
    let removedSize = 0;

    for (const file of files) {
      await tx.store.delete(file.url);
      removedSize += file.size;
      if (totalSize - removedSize < 8_000_000) break; // Target 8MB
    }
    await tx.done;
  }
}

// ============================================================================
// Settings Store
// ============================================================================

export async function setSetting(key: string, value: any) {
  const db = await getDB();
  await db.put('settings', { key, value });
}

export async function getSetting(key: string): Promise<any> {
  const db = await getDB();
  const setting = await db.get('settings', key);
  return setting?.value;
}

// ============================================================================
// Storage Info & Cleanup
// ============================================================================

export async function getStorageInfo() {
  const db = await getDB();
  const projects = await db.count('projects');
  const conversations = await db.count('conversations');
  const notifications = await db.count('notifications');
  const mutations = await db.count('pending_mutations');
  const files = await db.count('cached_files');

  return {
    projects,
    conversations,
    notifications,
    pending_mutations: mutations,
    cached_files: files,
  };
}

export async function clearAllCache() {
  const db = await getDB();
  const stores = ['projects', 'conversations', 'pulse', 'notifications', 'cached_files'];
  const tx = db.transaction(stores, 'readwrite');

  for (const storeName of stores) {
    await tx.objectStore(storeName).clear();
  }

  await tx.done;
}

export async function clearAllData() {
  const db = await getDB();
  await db.clear('projects');
  await db.clear('conversations');
  await db.clear('pulse');
  await db.clear('notifications');
  await db.clear('pending_mutations');
  await db.clear('cached_files');
  await db.clear('settings');
}

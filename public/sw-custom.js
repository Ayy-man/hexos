/**
 * Custom Service Worker for hexOS PWA
 * Handles push notifications and background sync
 */

// Listen for push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (error) {
    console.error('Failed to parse push data:', error);
    return;
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-72x72.png',
    tag: data.tag || 'hexos-notification',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'hexOS', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for pending mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncPendingMutations());
  }
});

async function syncPendingMutations() {
  try {
    // Open IndexedDB
    const db = await openIndexedDB();
    const mutations = await getAllPendingMutations(db);

    console.log(`[SW] Syncing ${mutations.length} pending mutations`);

    for (const mutation of mutations) {
      try {
        await syncMutation(mutation);
        await removeMutation(db, mutation.id);
      } catch (error) {
        console.error('[SW] Failed to sync mutation:', error);
        await incrementRetryCount(db, mutation.id);
      }
    }
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hexos-offline', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllPendingMutations(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_mutations'], 'readonly');
    const store = transaction.objectStore('pending_mutations');
    const request = store.getAll();

    request.onsuccess = () => {
      const mutations = request.result.filter(
        (m) => m.status === 'pending' || m.status === 'failed'
      );
      resolve(mutations);
    };
    request.onerror = () => reject(request.error);
  });
}

async function syncMutation(mutation) {
  // This would call your API endpoints
  // For now, just a placeholder
  console.log('[SW] Syncing mutation:', mutation.type);
}

async function removeMutation(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_mutations'], 'readwrite');
    const store = transaction.objectStore('pending_mutations');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function incrementRetryCount(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_mutations'], 'readwrite');
    const store = transaction.objectStore('pending_mutations');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const mutation = getRequest.result;
      if (mutation) {
        mutation.retry_count = (mutation.retry_count || 0) + 1;
        mutation.status = 'failed';
        store.put(mutation);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

console.log('[SW] hexOS service worker loaded');

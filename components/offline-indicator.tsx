'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, Loader2, CloudUpload } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { getSyncQueue } from '@/lib/offline/sync-queue';
import { getPendingMutations } from '@/lib/db/offline-storage';
import { Button } from '@/components/ui/button';
import { cn } from '@udecode/cn';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Update pending count
  useEffect(() => {
    async function updateCount() {
      const mutations = await getPendingMutations();
      setPendingCount(mutations.filter(m => m.status === 'pending').length);
    }

    updateCount();

    // Update every 5 seconds
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to sync status
  useEffect(() => {
    const syncQueue = getSyncQueue();
    const unsubscribe = syncQueue.onSyncStatusChange(() => {
      setIsSyncing(syncQueue.isSyncing());
    });
    return unsubscribe;
  }, []);

  // Only show banner when there are pending changes (not just offline)
  useEffect(() => {
    setShowBanner(pendingCount > 0 || (!isOnline && isSyncing));
  }, [isOnline, pendingCount, isSyncing]);

  // Auto-hide banner after 5 seconds when online with no pending changes
  useEffect(() => {
    if (isOnline && pendingCount === 0) {
      const timeout = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, pendingCount]);

  async function handleRetry() {
    const syncQueue = getSyncQueue();
    await syncQueue.syncAll();

    // Refresh pending count
    const mutations = await getPendingMutations();
    setPendingCount(mutations.filter(m => m.status === 'pending').length);
  }

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300',
        !isOnline
          ? 'bg-destructive/90 text-destructive-foreground border-destructive'
          : pendingCount > 0
          ? 'bg-warning/90 text-warning-foreground border-warning'
          : 'bg-success/90 text-success-foreground border-success'
      )}
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                You're offline. Some features are limited.
              </span>
            </>
          ) : isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
              <span className="text-sm font-medium">Syncing your changes...</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <CloudUpload className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                {pendingCount} {pendingCount === 1 ? 'change' : 'changes'} pending sync
              </span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Back online!</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && pendingCount > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Changes will sync when you're back online
            </span>
          )}

          {isOnline && pendingCount > 0 && !isSyncing && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              className="h-7 text-xs"
            >
              Sync now
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowBanner(false)}
            className="h-7 w-7 p-0"
          >
            <span className="sr-only">Dismiss</span>
            ×
          </Button>
        </div>
      </div>
    </div>
  );
}

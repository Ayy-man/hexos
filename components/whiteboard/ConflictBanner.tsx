'use client'

import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RemoteSaveInfo } from '@/hooks/use-whiteboard-realtime'

interface ConflictBannerProps {
  remoteSave: RemoteSaveInfo
  onPullLatest: () => void
  onDismiss: () => void
  isPulling?: boolean
}

export function ConflictBanner({
  remoteSave,
  onPullLatest,
  onDismiss,
  isPulling = false,
}: ConflictBannerProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
        <div className="text-sm">
          <span className="font-medium text-yellow-700">
            Someone else saved changes
          </span>
          <span className="text-muted-foreground ml-1">
            ({remoteSave.savedAt.toLocaleTimeString()})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPullLatest}
          disabled={isPulling}
          className="h-7 text-xs"
        >
          {isPulling ? (
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Pull Latest
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-7 w-7 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

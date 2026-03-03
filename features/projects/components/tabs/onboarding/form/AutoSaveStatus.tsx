'use client'

import { Loader2, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SaveStatus } from '../hooks/use-category-autosave'

interface AutoSaveStatusProps {
  status: SaveStatus
  error: string | null
  onRetry: () => void
}

export function AutoSaveStatus({ status, error, onRetry }: AutoSaveStatusProps) {
  return (
    <div
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      className="flex items-center gap-2 text-sm h-6"
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3.5 w-3.5 text-[--signal-good]" />
          <span className="text-muted-foreground">Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-[--signal-bad]" />
          <span className="text-[--signal-bad]">{error || 'Save failed'}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto py-0.5 px-1.5 text-xs"
            onClick={onRetry}
          >
            Retry
          </Button>
        </>
      )}
    </div>
  )
}

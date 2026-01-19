'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Bookmark, Clock, RotateCcw, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { DocumentVersion } from '@/lib/api/project-documents'
import { restoreVersionAction } from '../../actions/documentActions'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface VersionHistoryPanelProps {
  documentId: string
  projectId: string
  onClose: () => void
}

export function VersionHistoryPanel({
  documentId,
  projectId,
  onClose,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function loadVersions() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/documents/${documentId}/versions`)
        if (!res.ok) throw new Error('Failed to load versions')
        const data = await res.json()
        setVersions(data.versions || [])
      } catch (error) {
        console.error('Failed to load versions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadVersions()
  }, [documentId])

  const handleRestore = () => {
    if (!selectedVersionId) return
    startTransition(async () => {
      await restoreVersionAction(documentId, selectedVersionId, projectId)
      setShowRestoreDialog(false)
      setSelectedVersionId(null)
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      full: date.toLocaleString(),
    }
  }

  return (
    <div className="w-80 border-l flex flex-col bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Version History</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Version list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No versions yet. Changes are auto-saved periodically.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {versions.map((version) => {
              const date = formatDate(version.created_at)
              return (
                <div
                  key={version.id}
                  className={cn(
                    'p-3 rounded-lg cursor-pointer transition-colors',
                    selectedVersionId === version.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => setSelectedVersionId(version.id)}
                >
                  <div className="flex items-start gap-2">
                    {version.is_checkpoint ? (
                      <Bookmark className="h-4 w-4 text-amber-500 mt-0.5" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {version.description || `Version ${version.version_number}`}
                      </p>
                      <p className="text-xs text-muted-foreground" title={date.full}>
                        {date.relative}
                      </p>
                      {version.author && (
                        <p className="text-xs text-muted-foreground">
                          by {version.author.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Restore button */}
      {selectedVersionId && (
        <div className="p-4 border-t">
          <Button
            className="w-full"
            onClick={() => setShowRestoreDialog(true)}
            disabled={isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restore This Version
          </Button>
        </div>
      )}

      {/* Restore confirmation */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current content with this version. A checkpoint will be
              created before restoring so you can undo if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

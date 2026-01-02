'use client'

import { useState, useCallback, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { updateMainWhiteboardAction } from '../../actions/fileActions'
import { useDebouncedCallback } from '@/hooks/use-debounce'

// Dynamic import for Excalidraw (no SSR)
const ExcalidrawWrapper = dynamic(
  () => import('@/components/whiteboard/ExcalidrawWrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-muted animate-pulse rounded-lg">
        <span className="text-muted-foreground">Loading whiteboard...</span>
      </div>
    ),
  }
)

interface MainWhiteboardTabProps {
  projectId: string
  projectName: string
  initialContent: unknown
}

interface ExcalidrawContent {
  elements?: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

export function MainWhiteboardTab({
  projectId,
  projectName,
  initialContent,
}: MainWhiteboardTabProps) {
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Parse initial content
  const rawContent = (initialContent as ExcalidrawContent) || {
    elements: [],
    appState: {},
    files: {},
  }

  // Remove collaborators from appState - it's a Map internally and can't deserialize from JSON
  // See: https://github.com/excalidraw/excalidraw/issues/8637
  const parsedContent = {
    ...rawContent,
    appState: rawContent.appState
      ? { ...rawContent.appState, collaborators: undefined }
      : {},
  }

  // Debounced auto-save
  const debouncedSave = useDebouncedCallback(
    (content: unknown) => {
      startTransition(async () => {
        await updateMainWhiteboardAction(projectId, content)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      })
    },
    1000 // 1 second debounce
  )

  const handleChange = useCallback(
    (elements: unknown[], appState: unknown, files: unknown) => {
      setHasUnsavedChanges(true)
      debouncedSave({ elements, appState, files })
    },
    [debouncedSave]
  )

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{projectName} Whiteboard</h3>
        <div className="text-sm text-muted-foreground">
          {isPending ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          ) : hasUnsavedChanges ? (
            'Unsaved changes'
          ) : lastSaved ? (
            `Saved ${lastSaved.toLocaleTimeString()}`
          ) : (
            'Auto-save enabled'
          )}
        </div>
      </div>

      {/* Excalidraw Canvas */}
      <div className="h-[calc(100vh-280px)] min-h-[500px] border rounded-lg overflow-hidden">
        <ExcalidrawWrapper
          initialData={parsedContent}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}

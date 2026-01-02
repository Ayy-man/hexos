'use client'

import { useState, useCallback, useTransition, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Check, Circle } from 'lucide-react'
import { updateMainWhiteboardAction, getMainWhiteboardAction } from '../../actions/fileActions'
import { useDebouncedCallback } from '@/hooks/use-debounce'
import { useWhiteboardRealtime } from '@/hooks/use-whiteboard-realtime'
import { WhiteboardPresenceBar } from '@/components/whiteboard/WhiteboardPresenceBar'
import { ConflictBanner } from '@/components/whiteboard/ConflictBanner'
import type { UserRole } from '@/lib/auth/types'

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
  userId: string
  userRole: UserRole
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
  userId,
  userRole,
}: MainWhiteboardTabProps) {
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isPulling, setIsPulling] = useState(false)
  const [content, setContent] = useState<ExcalidrawContent | null>(null)
  const [contentKey, setContentKey] = useState(0) // Force re-render on pull

  // Scene version tracking refs (no re-renders)
  const sceneVersionRef = useRef<number>(0)
  const lastSavedVersionRef = useRef<number>(0)
  const pendingContentRef = useRef<unknown>(null)
  const isSavingRef = useRef<boolean>(false)

  // Create a profile-like object for the realtime hook
  const profile = {
    id: userId,
    name: 'User', // We don't have the name here, but presence will still work
    email: '',
    role: userRole,
    created_at: '',
  }

  // Realtime presence and conflict detection
  const { viewers, isConflicted, remoteSave, clearConflict } = useWhiteboardRealtime({
    projectId,
    profile,
    hasUnsavedChanges,
  })

  // Parse initial content
  const rawContent = (initialContent as ExcalidrawContent) || {
    elements: [],
    appState: {},
    files: {},
  }

  // Remove collaborators from appState - it's a Map internally and can't deserialize from JSON
  // See: https://github.com/excalidraw/excalidraw/issues/8637
  const parsedContent = content || {
    ...rawContent,
    appState: rawContent.appState
      ? { ...rawContent.appState, collaborators: undefined }
      : {},
  }

  // Pull latest content from server
  const handlePullLatest = useCallback(async () => {
    setIsPulling(true)
    try {
      const latest = await getMainWhiteboardAction(projectId)
      const latestContent = (latest as ExcalidrawContent) || {
        elements: [],
        appState: {},
        files: {},
      }

      // Remove collaborators from pulled content
      setContent({
        ...latestContent,
        appState: latestContent.appState
          ? { ...latestContent.appState, collaborators: undefined }
          : {},
      })

      // Reset version tracking
      sceneVersionRef.current = 0
      lastSavedVersionRef.current = 0
      pendingContentRef.current = null

      // Clear conflict and dirty state
      clearConflict()
      setHasUnsavedChanges(false)

      // Force Excalidraw to re-render with new content
      setContentKey((k) => k + 1)
    } catch (error) {
      console.error('Failed to pull latest:', error)
    } finally {
      setIsPulling(false)
    }
  }, [projectId, clearConflict])

  // Optimized debounced save - only saves if version changed
  const debouncedSave = useDebouncedCallback(
    async (versionToSave: number) => {
      // Skip if already saving or nothing pending
      if (isSavingRef.current || !pendingContentRef.current) return

      // Skip if this version was already saved
      if (versionToSave <= lastSavedVersionRef.current) return

      isSavingRef.current = true
      const contentToSave = pendingContentRef.current

      startTransition(async () => {
        try {
          await updateMainWhiteboardAction(projectId, contentToSave)
          lastSavedVersionRef.current = versionToSave
          setLastSaved(new Date())

          // Only clear dirty flag if no newer changes pending
          if (sceneVersionRef.current === versionToSave) {
            setHasUnsavedChanges(false)
          }
        } catch (error) {
          console.error('Whiteboard save failed:', error)
          // Keep dirty flag on error so user knows save failed
        } finally {
          isSavingRef.current = false
        }
      })
    },
    2000 // 2 second debounce
  )

  // Smart onChange handler - skips if scene version unchanged
  const handleChange = useCallback(
    (elements: unknown[], appState: unknown, files: unknown, sceneVersion: number) => {
      // CRITICAL: Skip if version unchanged (mouse moves, pans, selections)
      if (sceneVersion === sceneVersionRef.current) return

      sceneVersionRef.current = sceneVersion

      // Only mark dirty and save if differs from last saved
      if (sceneVersion !== lastSavedVersionRef.current) {
        setHasUnsavedChanges(true)
        pendingContentRef.current = { elements, appState, files }
        debouncedSave(sceneVersion)
      }
    },
    [debouncedSave]
  )

  // Save pending changes on unmount
  useEffect(() => {
    return () => {
      if (
        pendingContentRef.current &&
        sceneVersionRef.current > lastSavedVersionRef.current
      ) {
        // Fire-and-forget save on unmount
        updateMainWhiteboardAction(projectId, pendingContentRef.current).catch(
          console.error
        )
      }
    }
  }, [projectId])

  return (
    <div className="space-y-3">
      {/* Conflict Banner */}
      {isConflicted && remoteSave && (
        <ConflictBanner
          remoteSave={remoteSave}
          onPullLatest={handlePullLatest}
          onDismiss={clearConflict}
          isPulling={isPulling}
        />
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">{projectName} Whiteboard</h3>
          <WhiteboardPresenceBar viewers={viewers} />
        </div>
        <div className="text-sm text-muted-foreground">
          {isPending ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          ) : hasUnsavedChanges ? (
            <span className="flex items-center gap-1.5">
              <Circle className="h-2 w-2 fill-yellow-500 text-yellow-500" />
              Unsaved changes
            </span>
          ) : lastSaved ? (
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-green-500" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-muted-foreground" />
              Auto-save enabled
            </span>
          )}
        </div>
      </div>

      {/* Excalidraw Canvas */}
      <div className="h-[calc(100vh-300px)] min-h-[500px] border rounded-lg overflow-hidden">
        <ExcalidrawWrapper
          key={contentKey}
          initialData={parsedContent}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}

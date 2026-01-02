'use client'

import { useState, useCallback, useTransition, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Check, Loader2, Circle } from 'lucide-react'
import { updateWhiteboardContentAction, renameItemAction } from '../../actions/fileActions'
import { useDebouncedCallback } from '@/hooks/use-debounce'

// Dynamic import for Excalidraw (no SSR)
const ExcalidrawWrapper = dynamic(
  () => import('@/components/whiteboard/ExcalidrawWrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-muted animate-pulse">
        <span className="text-muted-foreground">Loading whiteboard...</span>
      </div>
    ),
  }
)

interface WhiteboardEditorProps {
  whiteboardId: string
  projectId: string
  initialTitle: string
  initialContent: unknown
  onClose: () => void
}

interface ExcalidrawContent {
  elements?: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

export function WhiteboardEditor({
  whiteboardId,
  projectId,
  initialTitle,
  initialContent,
  onClose,
}: WhiteboardEditorProps) {
  const { resolvedTheme } = useTheme()
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [title, setTitle] = useState(initialTitle)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(initialTitle)

  // Scene version tracking refs (no re-renders)
  const sceneVersionRef = useRef<number>(0)
  const lastSavedVersionRef = useRef<number>(0)
  const pendingContentRef = useRef<unknown>(null)
  const isSavingRef = useRef<boolean>(false)

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
          await updateWhiteboardContentAction(whiteboardId, contentToSave)
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
        updateWhiteboardContentAction(whiteboardId, pendingContentRef.current).catch(
          console.error
        )
      }
    }
  }, [whiteboardId])

  const handleTitleSave = () => {
    if (titleInput.trim() && titleInput !== title) {
      startTransition(async () => {
        await renameItemAction(whiteboardId, titleInput.trim())
        setTitle(titleInput.trim())
        setIsEditingTitle(false)
      })
    } else {
      setTitleInput(title)
      setIsEditingTitle(false)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setTitleInput(title)
      setIsEditingTitle(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-background z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>

          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleSave}
                className="h-8 w-64"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleTitleSave}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1
              className="text-lg font-semibold cursor-pointer hover:text-primary"
              onClick={() => setIsEditingTitle(true)}
            >
              {title}
            </h1>
          )}
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
      <div className="flex-1">
        <ExcalidrawWrapper
          initialData={parsedContent}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
